import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Download, Upload, CheckCircle2, XCircle, AlertCircle,
  FileSpreadsheet, ChevronDown, Loader2, RefreshCw,
  Table2, Eye, Info, Plus, SkipForward,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  restaurantStore, categoryStore, menuStore,
} from "@/lib/store";
import type { Category, MenuItem } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "Category Name Arabic",
  "Category Name English",
  "Item Name Arabic",
  "Item Name English",
  "Description Arabic",
  "Description English",
  "Calories",
  "Price",
  "Image URL",
  "Item URL / Slug",
  "Available Options / Addons",
  "Item Status (Active/Hidden)",
  "Sort Order",
];

const SAMPLE_ROWS = [
  ["وجبات سريعة", "Fast Food", "برغر لحم", "Beef Burger", "برغر لحم طازج مع صوص خاص", "Fresh beef burger with special sauce", 650, 35, "", "beef-burger", "Extra Cheese, No Onion", "Active", 1],
  ["وجبات سريعة", "Fast Food", "برغر دجاج", "Chicken Burger", "برغر دجاج مقرمش بالصوص السري", "Crispy chicken burger with secret sauce", 580, 28, "", "chicken-burger", "Extra Sauce, No Pickles", "Active", 2],
  ["مشروبات", "Beverages", "عصير برتقال", "Orange Juice", "عصير برتقال طازج 100٪", "100% fresh orange juice", 120, 15, "", "orange-juice", "", "Active", 1],
  ["مشروبات", "Beverages", "شاي أخضر", "Green Tea", "شاي أخضر طبيعي", "Natural green tea", 5, 12, "", "green-tea", "With Mint, With Lemon", "Active", 2],
];

const INSTRUCTIONS_ROWS = [
  ["Column", "Required", "Description", "Valid Values / Example"],
  ["Category Name Arabic", "Yes (or EN)", "Arabic name of the menu category", "وجبات سريعة، مشروبات"],
  ["Category Name English", "Yes (or AR)", "English name of the menu category", "Fast Food, Beverages"],
  ["Item Name Arabic", "Yes (or EN)", "Arabic name of the menu item", "برغر لحم"],
  ["Item Name English", "Yes (or AR)", "English name of the menu item", "Beef Burger"],
  ["Description Arabic", "No", "Arabic item description", "برغر لحم طازج مع صوص خاص"],
  ["Description English", "No", "English item description", "Fresh beef burger with special sauce"],
  ["Calories", "No", "Calorie count (number only)", "650"],
  ["Price", "Yes", "Price in SAR — numbers only", "35"],
  ["Image URL", "No", "Full URL to the item photo (https://...)", "https://example.com/img.jpg"],
  ["Item URL / Slug", "No", "URL-friendly ID — auto-generated if empty", "beef-burger"],
  ["Available Options / Addons", "No", "Comma-separated list of addon names", "Extra Cheese, No Onion, Large Size"],
  ["Item Status (Active/Hidden)", "No", "Controls visibility on customer menu", "Active  (default) or  Hidden"],
  ["Sort Order", "No", "Number — lower numbers appear first", "1, 2, 3 …"],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u0600-\u06FF\s]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function genId(prefix = "imp"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cellStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function cellNum(val: unknown): number | undefined {
  const n = parseFloat(String(val ?? ""));
  return isNaN(n) ? undefined : n;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  category_name_ar: string;
  category_name_en: string;
  item_name_ar: string;
  item_name_en: string;
  description_ar: string;
  description_en: string;
  calories?: number;
  price: number;
  image_url: string;
  slug: string;
  addons: string;
  status: "Active" | "Hidden";
  sort_order: number;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  rowNum: number;
  item_name: string;
  category_name: string;
  status: "success" | "skipped" | "error";
  message: string;
}

interface ImportSummary {
  created: number;
  skipped: number;
  errors: number;
  categoriesCreated: string[];
}

// ── Template download ─────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Instructions
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS);
  wsInstr["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 40 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  // Sheet 2: Menu Items
  const wsData = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
  wsData["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 28 }));
  wsData["!rows"] = [{ hpt: 20 }]; // taller header row
  XLSX.utils.book_append_sheet(wb, wsData, "Menu Items");

  XLSX.writeFile(wb, "matami-menu-template.xlsx");
}

// ── Excel parser ──────────────────────────────────────────────────────────────

function parseExcel(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", codepage: 65001 });

        // Find the "Menu Items" sheet, or fall back to first sheet
        const sheetName = wb.SheetNames.includes("Menu Items") ? "Menu Items" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        if (raw.length === 0) {
          reject(new Error("The sheet is empty or has no data rows."));
          return;
        }

        const rows: ParsedRow[] = raw.map((row, idx) => {
          const rowNum = idx + 2; // +2: 1-indexed + header row
          const errors: string[] = [];
          const warnings: string[] = [];

          const category_name_ar = cellStr(row["Category Name Arabic"]);
          const category_name_en = cellStr(row["Category Name English"]);
          const item_name_ar     = cellStr(row["Item Name Arabic"]);
          const item_name_en     = cellStr(row["Item Name English"]);
          const description_ar   = cellStr(row["Description Arabic"]);
          const description_en   = cellStr(row["Description English"]);
          const image_url        = cellStr(row["Image URL"]);
          const addons           = cellStr(row["Available Options / Addons"]);
          const rawStatus        = cellStr(row["Item Status (Active/Hidden)"]).toLowerCase();
          const status: "Active" | "Hidden" = rawStatus === "hidden" ? "Hidden" : "Active";

          const rawPrice    = row["Price"];
          const rawCalories = row["Calories"];
          const rawOrder    = row["Sort Order"];
          const rawSlug     = cellStr(row["Item URL / Slug"]);

          const price      = cellNum(rawPrice) ?? 0;
          const calories   = cellNum(rawCalories);
          const sort_order = cellNum(rawOrder) ?? idx;

          // Validation
          if (!category_name_ar && !category_name_en)
            errors.push("Category name (AR or EN) is required.");
          if (!item_name_ar && !item_name_en)
            errors.push("Item name (AR or EN) is required.");
          if (!rawPrice && rawPrice !== 0)
            errors.push("Price is required.");
          else if (price <= 0)
            errors.push(`Price must be greater than 0 (got: ${rawPrice}).`);

          if (image_url && !image_url.startsWith("http"))
            warnings.push("Image URL should start with http:// or https://");

          const slug = rawSlug || toSlug(item_name_en || item_name_ar) || genId("item");

          return {
            rowNum, category_name_ar, category_name_en,
            item_name_ar, item_name_en, description_ar, description_en,
            calories, price, image_url, slug, addons, status, sort_order,
            errors, warnings,
          };
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Import engine ─────────────────────────────────────────────────────────────

function runImport(
  rows: ParsedRow[],
  restaurantId: string
): { results: ImportResult[]; summary: ImportSummary } {
  const validRows = rows.filter((r) => r.errors.length === 0);
  const existingCategories = categoryStore.getAll();
  const existingItems = menuStore.getAll();

  const results: ImportResult[] = [];
  const createdCategoryNames: string[] = [];

  // Category cache (to avoid duplicates within the import batch)
  const categoryCache = new Map<string, Category>();

  // Pre-populate cache with existing categories
  for (const cat of existingCategories) {
    if (cat.restaurant_id === restaurantId) {
      categoryCache.set(cat.name_en.toLowerCase(), cat);
      categoryCache.set(cat.name_ar, cat);
    }
  }

  // Track newly created items (to detect within-batch duplicates)
  const importedItemKeys = new Set<string>();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of validRows) {
    const itemNameEn = row.item_name_en || row.item_name_ar;
    const itemNameAr = row.item_name_ar || row.item_name_en;
    const catNameEn  = row.category_name_en || row.category_name_ar;
    const catNameAr  = row.category_name_ar  || row.category_name_en;

    // ── Find or create category ──────────────────────────────────────────────
    const catKey = (catNameEn || catNameAr).toLowerCase();
    let category = categoryCache.get(catKey) ?? categoryCache.get(catNameAr);

    if (!category) {
      category = {
        id: genId("cat"),
        restaurant_id: restaurantId,
        name_en: catNameEn,
        name_ar: catNameAr,
        sort_order: existingCategories.filter((c) => c.restaurant_id === restaurantId).length + categoryCache.size,
        hidden: false,
      };
      categoryStore.save(category);
      categoryCache.set(catNameEn.toLowerCase(), category);
      categoryCache.set(catNameAr, category);
      const label = catNameEn || catNameAr;
      if (!createdCategoryNames.includes(label)) createdCategoryNames.push(label);
    }

    // ── Duplicate check ──────────────────────────────────────────────────────
    const dupKeyEn = `${restaurantId}::${itemNameEn.toLowerCase()}`;
    const dupKeyAr = `${restaurantId}::${itemNameAr}`;

    const isStoreDuplicate = existingItems.some(
      (m) =>
        m.restaurant_id === restaurantId &&
        ((itemNameEn && m.name_en.toLowerCase() === itemNameEn.toLowerCase()) ||
          (itemNameAr && m.name_ar === itemNameAr))
    );

    const isBatchDuplicate = importedItemKeys.has(dupKeyEn) || importedItemKeys.has(dupKeyAr);

    if (isStoreDuplicate || isBatchDuplicate) {
      results.push({
        rowNum: row.rowNum,
        item_name: itemNameEn || itemNameAr,
        category_name: catNameEn || catNameAr,
        status: "skipped",
        message: "Duplicate — item already exists with this name.",
      });
      skipped++;
      continue;
    }

    // ── Create item ──────────────────────────────────────────────────────────
    try {
      const item: MenuItem = {
        id: genId("item"),
        restaurant_id: restaurantId,
        category_id: category.id,
        name_en: itemNameEn,
        name_ar: itemNameAr,
        description_en: row.description_en,
        description_ar: row.description_ar,
        price: row.price,
        calories: row.calories,
        image_url: row.image_url || undefined,
        is_available: row.status === "Active",
        is_popular: false,
        is_new: true,
        hidden: row.status === "Hidden",
        sort_order: row.sort_order,
      };

      menuStore.save(item);
      importedItemKeys.add(dupKeyEn);
      importedItemKeys.add(dupKeyAr);
      existingItems.push(item); // keep in-memory list fresh for this batch

      results.push({
        rowNum: row.rowNum,
        item_name: itemNameEn || itemNameAr,
        category_name: catNameEn || catNameAr,
        status: "success",
        message: `Created under "${catNameEn || catNameAr}"`,
      });
      created++;
    } catch (err) {
      results.push({
        rowNum: row.rowNum,
        item_name: itemNameEn || itemNameAr,
        category_name: catNameEn || catNameAr,
        status: "error",
        message: String(err),
      });
      errors++;
    }
  }

  // Add error results for rows with validation failures
  for (const row of rows.filter((r) => r.errors.length > 0)) {
    results.push({
      rowNum: row.rowNum,
      item_name: row.item_name_en || row.item_name_ar || `Row ${row.rowNum}`,
      category_name: row.category_name_en || row.category_name_ar || "—",
      status: "error",
      message: row.errors.join(" | "),
    });
    errors++;
  }

  results.sort((a, b) => a.rowNum - b.rowNum);

  return {
    results,
    summary: { created, skipped, errors, categoriesCreated: createdCategoryNames },
  };
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({
  onFile, isDragging, setIsDragging,
}: {
  onFile: (f: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert(t("Please upload an Excel file (.xlsx)", "يرجى رفع ملف Excel (.xlsx)"));
      return;
    }
    onFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
        isDragging ? "border-primary bg-primary/8 scale-[1.01]" : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-primary/20" : "bg-white/5"}`}>
        <FileSpreadsheet size={26} className={isDragging ? "text-primary" : "text-muted-foreground"} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">{t("Drop your Excel file here", "أسقط ملف Excel هنا")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("or click to browse — .xlsx files only", "أو انقر للتصفح — ملفات .xlsx فقط")}</p>
      </div>
      {isDragging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-0 pointer-events-none" />
      )}
    </div>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  const { t } = useLanguage();
  const valid   = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-green-400">
          <CheckCircle2 size={14} /> {valid.length} {t("valid rows", "صف صالح")}
        </span>
        {invalid.length > 0 && (
          <span className="flex items-center gap-1.5 text-red-400">
            <XCircle size={14} /> {invalid.length} {t("with errors", "بأخطاء")}
          </span>
        )}
        {rows.some((r) => r.warnings.length > 0) && (
          <span className="flex items-center gap-1.5 text-yellow-400">
            <AlertCircle size={14} /> {rows.filter((r) => r.warnings.length > 0).length} {t("with warnings", "بتحذيرات")}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-white/5 text-muted-foreground text-left">
              <th className="px-3 py-2.5 font-medium w-12">#</th>
              <th className="px-3 py-2.5 font-medium">{t("Category", "الفئة")}</th>
              <th className="px-3 py-2.5 font-medium">{t("Item Name", "اسم الصنف")}</th>
              <th className="px-3 py-2.5 font-medium w-20">{t("Price", "السعر")}</th>
              <th className="px-3 py-2.5 font-medium w-20">{t("Cal.", "سعر حراري")}</th>
              <th className="px-3 py-2.5 font-medium w-20">{t("Status", "الحالة")}</th>
              <th className="px-3 py-2.5 font-medium">{t("Notes", "ملاحظات")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const hasError   = row.errors.length > 0;
              const hasWarning = row.warnings.length > 0 && !hasError;
              return (
                <tr key={row.rowNum} className={`${hasError ? "bg-red-500/5" : hasWarning ? "bg-yellow-500/5" : ""}`}>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{row.rowNum}</td>
                  <td className="px-3 py-2">
                    <div className="text-xs text-foreground">{row.category_name_en || row.category_name_ar || "—"}</div>
                    {row.category_name_ar && <div className="text-[10px] text-muted-foreground" dir="rtl">{row.category_name_ar}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs text-foreground">{row.item_name_en || row.item_name_ar || "—"}</div>
                    {row.item_name_ar && <div className="text-[10px] text-muted-foreground" dir="rtl">{row.item_name_ar}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.price > 0 ? `${row.price} ﷼` : <span className="text-red-400">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.calories ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${row.status === "Active" ? "bg-green-500/15 text-green-400" : "bg-white/8 text-muted-foreground"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    {hasError && <p className="text-[11px] text-red-400 flex items-start gap-1"><XCircle size={11} className="flex-shrink-0 mt-0.5" />{row.errors.join(" | ")}</p>}
                    {hasWarning && <p className="text-[11px] text-yellow-400 flex items-start gap-1"><AlertCircle size={11} className="flex-shrink-0 mt-0.5" />{row.warnings.join(" | ")}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Results log ───────────────────────────────────────────────────────────────

function ResultsLog({ results, summary }: { results: ImportResult[]; summary: ImportSummary }) {
  const { t } = useLanguage();

  const statusIcon = (s: ImportResult["status"]) => {
    if (s === "success") return <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />;
    if (s === "skipped") return <SkipForward   size={13} className="text-yellow-400 flex-shrink-0" />;
    return <XCircle size={13} className="text-red-400 flex-shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{summary.created}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("Items Imported", "عناصر مستوردة")}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{summary.skipped}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("Duplicates Skipped", "مكررات متخطاة")}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{summary.errors}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("Errors", "أخطاء")}</p>
        </div>
      </div>

      {/* New categories */}
      {summary.categoriesCreated.length > 0 && (
        <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
          <Plus size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-foreground font-medium">{t("New categories created: ", "فئات جديدة تم إنشاؤها: ")}</span>
            <span className="text-primary">{summary.categoriesCreated.join(", ")}</span>
          </div>
        </div>
      )}

      {/* Per-row log */}
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-white/5 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-white/8">
          {t("Import Log", "سجل الاستيراد")} ({results.length} {t("rows", "صف")})
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
          {results.map((r) => (
            <div key={r.rowNum} className="flex items-start gap-2.5 px-4 py-2">
              {statusIcon(r.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0">Row {r.rowNum}</span>
                  <span className="text-xs font-medium text-foreground truncate">{r.item_name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">→ {r.category_name}</span>
                </div>
                <p className={`text-[11px] mt-0.5 ${
                  r.status === "success" ? "text-green-400/80"
                  : r.status === "skipped" ? "text-yellow-400/80" : "text-red-400/80"
                }`}>{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminMenuImport() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));

  const [restaurantId, setRestaurantId] = useState("");
  const [fileName, setFileName]         = useState("");
  const [isDragging, setIsDragging]     = useState(false);
  const [isParsing, setIsParsing]       = useState(false);
  const [isImporting, setIsImporting]   = useState(false);
  const [parsedRows, setParsedRows]     = useState<ParsedRow[] | null>(null);
  const [results, setResults]           = useState<ImportResult[] | null>(null);
  const [summary, setSummary]           = useState<ImportSummary | null>(null);
  const [showPreview, setShowPreview]   = useState(true);

  const validCount = parsedRows?.filter((r) => r.errors.length === 0).length ?? 0;

  function reset() {
    setParsedRows(null);
    setResults(null);
    setSummary(null);
    setFileName("");
  }

  async function handleFile(file: File) {
    if (!restaurantId) {
      toast({ title: t("Select a restaurant first", "اختر مطعماً أولاً"), variant: "destructive" });
      return;
    }
    setIsParsing(true);
    reset();
    setFileName(file.name);
    try {
      const rows = await parseExcel(file);
      setParsedRows(rows);
      toast({ title: t(`Parsed ${rows.length} rows successfully`, `تم تحليل ${rows.length} صف بنجاح`) });
    } catch (err) {
      toast({ title: t("Failed to parse file", "فشل تحليل الملف"), description: String(err), variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!parsedRows || !restaurantId) return;
    setIsImporting(true);
    try {
      await new Promise((r) => setTimeout(r, 60)); // let UI update
      const { results: res, summary: sum } = runImport(parsedRows, restaurantId);
      setResults(res);
      setSummary(sum);
      toast({ title: t(`✅ Import complete — ${sum.created} items added`, `✅ اكتمل الاستيراد — ${sum.created} عنصر مضاف`) });
    } catch (err) {
      toast({ title: t("Import failed", "فشل الاستيراد"), description: String(err), variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  }

  const selectedRestaurant = restaurants.find((r) => r.id === restaurantId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-primary" />
          {t("Excel Menu Import", "استيراد المنيو من Excel")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Upload a filled Excel file to bulk-import categories and menu items into the system.",
            "ارفع ملف Excel مكتملاً لاستيراد الفئات وعناصر المنيو بشكل مجمّع."
          )}
        </p>
      </motion.div>

      {/* Step 1 — Select restaurant */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="bg-card border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">1</div>
          <h2 className="text-sm font-bold text-foreground">{t("Select Restaurant", "اختر المطعم")}</h2>
        </div>
        <div className="relative">
          <select
            value={restaurantId}
            onChange={(e) => { setRestaurantId(e.target.value); reset(); }}
            className="w-full appearance-none bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
          >
            <option value="">{t("— Choose a restaurant —", "— اختر مطعماً —")}</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name_en} / {r.name_ar}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        {selectedRestaurant && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info size={11} /> {t("Items will be imported into", "سيتم الاستيراد إلى")} <span className="text-foreground font-medium">{selectedRestaurant.name_en}</span>
          </p>
        )}
      </motion.div>

      {/* Step 2 — Download template */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
        className="bg-card border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">2</div>
          <h2 className="text-sm font-bold text-foreground">{t("Download Template", "تحميل القالب")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Download the official template and fill it with your menu data. It includes sample rows and an Instructions sheet.",
            "حمّل القالب الرسمي وأضف بيانات المنيو. يتضمن صفوفاً نموذجية وورقة تعليمات."
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition shadow-md shadow-primary/25"
          >
            <Download size={15} />
            {t("Download Excel Template", "تحميل قالب Excel")}
          </motion.button>

          <div className="flex flex-wrap gap-2">
            {TEMPLATE_HEADERS.map((h) => (
              <span key={h} className="text-[10px] bg-white/5 border border-white/8 px-2 py-1 rounded-lg text-muted-foreground">{h}</span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Step 3 — Upload */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.11 }}
        className="bg-card border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">3</div>
            <h2 className="text-sm font-bold text-foreground">{t("Upload Your Excel File", "رفع ملف Excel")}</h2>
          </div>
          {(parsedRows || fileName) && (
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              <RefreshCw size={11} /> {t("Reset", "إعادة")}
            </button>
          )}
        </div>

        {!parsedRows && !isParsing && (
          <UploadZone onFile={handleFile} isDragging={isDragging} setIsDragging={setIsDragging} />
        )}

        {isParsing && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm">{t("Parsing your file…", "جاري تحليل الملف…")}</p>
          </div>
        )}

        {parsedRows && !results && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-white/3 rounded-xl border border-white/8">
            <FileSpreadsheet size={14} className="text-primary flex-shrink-0" />
            <span className="flex-1 truncate font-medium text-foreground">{fileName}</span>
            <span className="text-xs text-green-400">{parsedRows.length} {t("rows read", "صف")}</span>
          </div>
        )}
      </motion.div>

      {/* Step 4 — Preview */}
      <AnimatePresence>
        {parsedRows && !results && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-white/10 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">4</div>
                <h2 className="text-sm font-bold text-foreground">{t("Preview & Validate", "معاينة والتحقق")}</h2>
              </div>
              <button onClick={() => setShowPreview((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                {showPreview ? <><Eye size={12} /> {t("Hide", "إخفاء")}</> : <><Table2 size={12} /> {t("Show", "عرض")}</>}
              </button>
            </div>

            {showPreview && <PreviewTable rows={parsedRows} />}

            {/* Import button */}
            {validCount > 0 ? (
              <div className="flex items-center gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleImport}
                  disabled={isImporting || !restaurantId}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-primary/30"
                >
                  {isImporting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {isImporting
                    ? t("Importing…", "جاري الاستيراد…")
                    : t(`Import ${validCount} items`, `استيراد ${validCount} عنصر`)}
                </motion.button>
                {parsedRows.some((r) => r.errors.length > 0) && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {parsedRows.filter((r) => r.errors.length > 0).length} {t("rows will be skipped due to errors", "صف سيتم تخطيه بسبب أخطاء")}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <XCircle size={13} /> {t("No valid rows to import. Fix the errors above.", "لا توجد صفوف صالحة للاستيراد. قم بإصلاح الأخطاء أعلاه.")}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 5 — Results */}
      <AnimatePresence>
        {results && summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-white/10 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <h2 className="text-sm font-bold text-foreground">{t("Import Complete", "اكتمل الاستيراد")}</h2>
              </div>
              <button
                onClick={() => { reset(); setRestaurantId(""); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition border border-white/10 px-3 py-1.5 rounded-lg"
              >
                <RefreshCw size={11} /> {t("New Import", "استيراد جديد")}
              </button>
            </div>
            <ResultsLog results={results} summary={summary} />
            {summary.created > 0 && (
              <div className="pt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Info size={11} />
                {t(
                  "Imported items are now live on the customer menu — they appear in categories, search, and ordering exactly like native items.",
                  "العناصر المستوردة متاحة الآن في قائمة العملاء — تظهر في الفئات والبحث والطلب تماماً مثل العناصر الأصلية."
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
