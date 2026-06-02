import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Phone, MapPin, ShoppingBag, ChevronDown, ChevronUp, FileText, Trash2, SortAsc } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { customerStore, orderStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import { safeGetTime, safeLocalDate } from "@/lib/dateUtils";

type SortKey = "total_orders" | "last_order_date" | "name";

export default function AdminCustomers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const customers = useStore(useCallback(() => customerStore.getAll(), []));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("last_order_date");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; text: string } | null>(null);

  const filtered = customers
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    })
    .sort((a, b) => {
      if (sort === "total_orders") return b.total_orders - a.total_orders;
      if (sort === "last_order_date") return safeGetTime(b.last_order_date) - safeGetTime(a.last_order_date);
      return a.name.localeCompare(b.name);
    });

  const handleSaveNote = (customerId: string, note: string) => {
    const c = customerStore.getById(customerId);
    if (!c) return;
    customerStore.save({ ...c, notes: note });
    setEditingNote(null);
    toast({ title: t("Note saved", "تم حفظ الملاحظة") });
  };

  const handleDelete = (id: string) => {
    customerStore.delete(id);
    toast({ title: t("Customer deleted", "تم حذف العميل") });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("👤 Customers (CRM)", "👤 العملاء (CRM)")}</h1>
            <p className="text-sm text-muted-foreground">{t(`${customers.length} customers`, `${customers.length} عميل`)}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-card border border-white/5 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search name or phone...", "ابحث بالاسم أو الجوال...")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            data-testid="input-search-customers"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-card border border-white/5 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none"
        >
          <option value="last_order_date">{t("Latest order", "آخر طلب")}</option>
          <option value="total_orders">{t("Most orders", "أكثر طلبات")}</option>
          <option value="name">{t("Name A-Z", "الاسم أ-ي")}</option>
        </select>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((customer) => {
            const orders = orderStore.getByCustomer(customer.id);
            const isExpanded = expanded === customer.id;

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-card border border-white/5 rounded-2xl overflow-hidden"
                data-testid={`customer-row-${customer.id}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm">{customer.name}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {customer.total_orders} {t("orders", "طلبات")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone size={11} />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={11} />
                            <span className="line-clamp-1 max-w-40">{customer.location}</span>
                          </div>
                        )}
                      </div>
                      {customer.last_order_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("Last order:", "آخر طلب:")} {safeLocalDate(customer.last_order_date)}
                        </p>
                      )}
                      {customer.notes && (
                        <p className="text-xs text-yellow-400/80 mt-1 bg-yellow-400/5 px-2 py-1 rounded-lg border border-yellow-400/10 line-clamp-1">
                          📝 {customer.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingNote({ id: customer.id, text: customer.notes || "" })}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                        title={t("Add note", "إضافة ملاحظة")}
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : customer.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                        data-testid={`btn-expand-${customer.id}`}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline note editor */}
                {editingNote?.id === customer.id && (
                  <div className="px-4 pb-4">
                    <textarea
                      value={editingNote.text}
                      onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                      rows={2}
                      placeholder={t("Add a note...", "أضف ملاحظة...")}
                      className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveNote(customer.id, editingNote.text)}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium"
                      >
                        {t("Save", "حفظ")}
                      </button>
                      <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-muted-foreground">
                        {t("Cancel", "إلغاء")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Order history */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{t("Order History", "سجل الطلبات")}</p>
                        {orders.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t("No orders yet", "لا توجد طلبات")}</p>
                        ) : (
                          orders.map((order) => (
                            <div key={order.id} className="bg-background rounded-xl p-3 border border-white/5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-primary">{order.id}</span>
                                <span className="text-xs text-muted-foreground">{safeLocalDate((order as any).date ?? (order as any).created_at)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{order.restaurant_name} · {order.branch_name}</p>
                              <p className="text-xs text-foreground mt-1">{order.items.map((i) => `${i.name_en} ×${i.quantity}`).join(", ")}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">{order.type === "delivery" ? t("Delivery", "توصيل") : t("Pickup", "استلام")}</span>
                                <span className="text-sm font-bold text-primary">{order.total} ﷼</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? t("No customers match your search", "لا يوجد عملاء مطابقون لبحثك") : t("No customers yet. Orders will appear here automatically.", "لا يوجد عملاء حتى الآن. ستظهر الطلبات هنا تلقائياً.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
