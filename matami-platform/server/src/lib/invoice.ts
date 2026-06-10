/**
 * Bilingual (AR/EN) order invoice — rendered server-side as a print/PDF-ready
 * HTML document, plus a plain-text version for WhatsApp sharing.
 */
import { num } from "./prisma";
import { whatsappLink } from "./notify";

export interface InvoiceOrder {
  orderNo: number;
  createdAt: Date;
  status: string;
  type: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  notes: string;
  driverName: string;
  driverPhone: string;
  subtotal: unknown;
  deliveryFee: unknown;
  discount: unknown;
  vatAmount: unknown;
  total: unknown;
  items: Array<{
    name_en: string;
    name_ar: string;
    variant_en: string;
    variant_ar: string;
    qty: number;
    unitPrice: unknown;
    lineTotal: unknown;
    addons: unknown;
    notes: string;
  }>;
  zone?: { name_en: string; name_ar: string } | null;
  branch: { name_en: string; name_ar: string; phone: string };
  restaurant: {
    name_en: string;
    name_ar: string;
    logoUrl: string;
    phone: string;
    whatsapp: string;
    website: string;
    email: string;
    vatNumber: string;
    vatRate: unknown;
    currency: string;
  };
}

type AddonSnap = { name_en: string; name_ar: string; price: number };

const PAYMENT_LABELS: Record<string, [string, string]> = {
  CASH: ["Cash on delivery", "الدفع عند الاستلام"],
  MADA: ["Mada", "مدى"],
  STC_PAY: ["STC Pay", "STC Pay"],
  APPLE_PAY: ["Apple Pay", "Apple Pay"],
  GOOGLE_PAY: ["Google Pay", "Google Pay"],
  VISA: ["Visa", "فيزا"],
  MASTERCARD: ["Mastercard", "ماستركارد"],
};

const TYPE_LABELS: Record<string, [string, string]> = {
  DELIVERY: ["Delivery", "توصيل"],
  PICKUP: ["Pickup", "استلام من الفرع"],
};

function money(v: unknown, currency: string): string {
  return `${num(v).toFixed(2)} ${currency}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function invoiceWhatsAppText(order: InvoiceOrder, invoiceUrl: string): string {
  const r = order.restaurant;
  const cur = r.currency;
  const lines: string[] = [
    `🧾 *${r.name_ar} | ${r.name_en}*`,
    `فاتورة طلب / Order Invoice #${order.orderNo}`,
    `${order.createdAt.toLocaleString("en-GB")}`,
    `الفرع / Branch: ${order.branch.name_ar} | ${order.branch.name_en}`,
    `العميل / Customer: ${order.customerName} (${order.customerPhone})`,
    `النوع / Type: ${TYPE_LABELS[order.type]?.[1] ?? order.type}`,
    `الدفع / Payment: ${PAYMENT_LABELS[order.paymentMethod]?.[1] ?? order.paymentMethod}`,
    ``,
    `*الطلبات / Items:*`,
  ];
  for (const it of order.items) {
    const variant = it.variant_ar ? ` (${it.variant_ar})` : "";
    lines.push(`• ${it.qty}× ${it.name_ar}${variant} / ${it.name_en} — ${money(it.lineTotal, cur)}`);
    for (const a of (it.addons as AddonSnap[]) ?? []) {
      lines.push(`   + ${a.name_ar} / ${a.name_en} (${money(a.price, cur)})`);
    }
    if (it.notes) lines.push(`   📝 ${it.notes}`);
  }
  lines.push(
    ``,
    `المجموع / Subtotal: ${money(order.subtotal, cur)}`,
    `التوصيل / Delivery: ${money(order.deliveryFee, cur)}`,
  );
  if (num(order.discount) > 0) lines.push(`الخصم / Discount: -${money(order.discount, cur)}`);
  lines.push(
    `الضريبة / VAT (${num(r.vatRate)}%): ${money(order.vatAmount, cur)}`,
    `*الإجمالي / TOTAL: ${money(order.total, cur)}*`,
    ``,
    `🔗 ${invoiceUrl}`,
    `شكراً لطلبكم 🌹 Thank you for your order!`,
  );
  return lines.join("\n");
}

export function invoiceShareLink(order: InvoiceOrder, invoiceUrl: string): string {
  return whatsappLink(order.customerPhone, invoiceWhatsAppText(order, invoiceUrl));
}

export function renderInvoiceHtml(order: InvoiceOrder, invoiceUrl: string): string {
  const r = order.restaurant;
  const cur = r.currency;
  const pay = PAYMENT_LABELS[order.paymentMethod] ?? [order.paymentMethod, order.paymentMethod];
  const typ = TYPE_LABELS[order.type] ?? [order.type, order.type];
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(invoiceUrl)}`;

  const itemRows = order.items
    .map((it) => {
      const addons = ((it.addons as AddonSnap[]) ?? [])
        .map(
          (a) =>
            `<div class="addon">+ ${esc(a.name_ar)} / ${esc(a.name_en)} <span>${money(a.price, cur)}</span></div>`,
        )
        .join("");
      const notes = it.notes ? `<div class="addon">📝 ${esc(it.notes)}</div>` : "";
      const variant =
        it.variant_en || it.variant_ar
          ? `<div class="variant">${esc(it.variant_ar)} / ${esc(it.variant_en)}</div>`
          : "";
      return `<tr>
        <td class="item-name"><div>${esc(it.name_ar)}</div><div class="en">${esc(it.name_en)}</div>${variant}${addons}${notes}</td>
        <td>${it.qty}</td>
        <td>${money(it.unitPrice, cur)}</td>
        <td>${money(it.lineTotal, cur)}</td>
      </tr>`;
    })
    .join("");

  const driver =
    order.driverName || order.driverPhone
      ? `<div class="meta-row"><span>السائق / Driver</span><b>${esc(order.driverName)} ${esc(order.driverPhone)}</b></div>`
      : "";
  const zone = order.zone
    ? `<div class="meta-row"><span>منطقة التوصيل / Zone</span><b>${esc(order.zone.name_ar)} / ${esc(order.zone.name_en)}</b></div>`
    : "";
  const address = order.addressText
    ? `<div class="meta-row"><span>العنوان / Address</span><b>${esc(order.addressText)}</b></div>`
    : "";
  const discountRow =
    num(order.discount) > 0
      ? `<div class="sum-row"><span>الخصم / Discount</span><b>-${money(order.discount, cur)}</b></div>`
      : "";
  const logo = r.logoUrl ? `<img class="logo" src="${esc(r.logoUrl)}" alt="logo"/>` : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>فاتورة #${order.orderNo} — ${esc(r.name_ar)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; background:#f3f4f6; color:#111827; padding:16px; }
  .sheet { max-width:420px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden;
           box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .head { text-align:center; padding:20px 16px 12px; border-bottom:2px dashed #e5e7eb; }
  .logo { width:64px; height:64px; object-fit:contain; border-radius:14px; margin-bottom:8px; }
  .head h1 { font-size:18px; } .head .en { color:#6b7280; font-size:13px; }
  .badge { display:inline-block; margin-top:8px; background:#111827; color:#fff; border-radius:999px;
           padding:4px 14px; font-size:13px; }
  .meta { padding:12px 16px; border-bottom:2px dashed #e5e7eb; }
  .meta-row { display:flex; justify-content:space-between; gap:12px; font-size:12.5px; padding:3px 0; }
  .meta-row span { color:#6b7280; } .meta-row b { text-align:left; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  thead th { background:#f9fafb; color:#6b7280; font-weight:600; padding:8px 6px; text-align:right; }
  thead th:nth-child(n+2), td:nth-child(n+2) { text-align:center; white-space:nowrap; }
  td { padding:8px 6px; border-top:1px solid #f3f4f6; vertical-align:top; }
  .item-name .en, .variant { color:#6b7280; font-size:11.5px; }
  .addon { color:#6b7280; font-size:11px; display:flex; justify-content:space-between; }
  .sums { padding:12px 16px; border-top:2px dashed #e5e7eb; }
  .sum-row { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; }
  .sum-row.total { font-size:16px; font-weight:800; border-top:1px solid #e5e7eb; margin-top:6px; padding-top:8px; }
  .foot { text-align:center; padding:14px 16px 20px; border-top:2px dashed #e5e7eb; font-size:12px; color:#6b7280; }
  .foot img { margin:10px auto; display:block; }
  .thanks { font-size:14px; color:#111827; font-weight:700; margin-top:4px; }
  .print-btn { display:block; width:calc(100% - 32px); margin:12px 16px; padding:12px; border:0; border-radius:12px;
               background:#16a34a; color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
  @media print { body { background:#fff; padding:0; } .sheet { box-shadow:none; max-width:100%; } .print-btn { display:none; } }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    ${logo}
    <h1>${esc(r.name_ar)}</h1>
    <div class="en">${esc(r.name_en)}</div>
    <div class="badge">فاتورة / Invoice #${order.orderNo}</div>
  </div>
  <div class="meta">
    <div class="meta-row"><span>الفرع / Branch</span><b>${esc(order.branch.name_ar)} / ${esc(order.branch.name_en)}</b></div>
    <div class="meta-row"><span>التاريخ / Date</span><b>${order.createdAt.toLocaleString("en-GB")}</b></div>
    <div class="meta-row"><span>العميل / Customer</span><b>${esc(order.customerName)}</b></div>
    <div class="meta-row"><span>الجوال / Phone</span><b dir="ltr">${esc(order.customerPhone)}</b></div>
    ${address}${zone}
    <div class="meta-row"><span>نوع الطلب / Type</span><b>${typ[1]} / ${typ[0]}</b></div>
    <div class="meta-row"><span>الدفع / Payment</span><b>${pay[1]} / ${pay[0]}</b></div>
    ${driver}
    ${r.vatNumber ? `<div class="meta-row"><span>الرقم الضريبي / VAT No.</span><b dir="ltr">${esc(r.vatNumber)}</b></div>` : ""}
  </div>
  <table>
    <thead><tr><th>الصنف / Item</th><th>الكمية<br/>Qty</th><th>السعر<br/>Unit</th><th>الإجمالي<br/>Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="sums">
    <div class="sum-row"><span>المجموع الفرعي / Subtotal</span><b>${money(order.subtotal, cur)}</b></div>
    <div class="sum-row"><span>رسوم التوصيل / Delivery</span><b>${money(order.deliveryFee, cur)}</b></div>
    ${discountRow}
    <div class="sum-row"><span>ضريبة القيمة المضافة / VAT (${num(r.vatRate)}%)</span><b>${money(order.vatAmount, cur)}</b></div>
    <div class="sum-row total"><span>الإجمالي النهائي / GRAND TOTAL</span><b>${money(order.total, cur)}</b></div>
  </div>
  <div class="foot">
    ${r.phone ? `☎ <span dir="ltr">${esc(r.phone)}</span> · ` : ""}${r.whatsapp ? `WhatsApp <span dir="ltr">${esc(r.whatsapp)}</span>` : ""}
    ${r.website ? `<div>${esc(r.website)}</div>` : ""}
    ${r.email ? `<div>${esc(r.email)}</div>` : ""}
    <img src="${qr}" width="120" height="120" alt="QR"/>
    <div class="thanks">شكراً لطلبكم 🌹 Thank you for your order!</div>
  </div>
  <button class="print-btn" onclick="window.print()">طباعة / حفظ PDF — Print / Save PDF</button>
</div>
</body>
</html>`;
}
