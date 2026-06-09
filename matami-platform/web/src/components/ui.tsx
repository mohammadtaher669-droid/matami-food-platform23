/** Shared UI kit — themed via CSS variables set by the theme engine. */
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, X, AlertTriangle, Inbox } from "lucide-react";

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ── Buttons ──────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-[var(--th-primary)] text-[var(--th-primary-fg)] hover:opacity-90",
    outline: "border border-[var(--th-primary)] text-[var(--th-primary)] hover:bg-[var(--th-primary)]/10",
    ghost: "text-[var(--th-text)] hover:bg-black/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={cls(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all rounded-[var(--th-btn-radius)] disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Form fields ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-[var(--th-radius)] border border-black/10 bg-[var(--th-surface)] px-3 py-2.5 text-sm text-[var(--th-text)] outline-none focus:border-[var(--th-primary)] focus:ring-2 focus:ring-[var(--th-primary)]/20 placeholder:text-[var(--th-muted)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cls(inputCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cls(inputCls, "min-h-[80px]", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cls(inputCls, props.className)} />;
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-[var(--th-muted)]">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[var(--th-muted)]">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 select-none"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={cls(
          "h-6 w-11 rounded-full p-0.5 transition-colors",
          checked ? "bg-[var(--th-primary)]" : "bg-black/20",
        )}
      >
        <span className={cls("block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "ltr:translate-x-5 rtl:-translate-x-5" : "")} />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cls("rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warn" | "danger" | "info" }) {
  const tones = {
    default: "bg-black/5 text-[var(--th-text)]",
    success: "bg-green-100 text-green-800",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };
  return <span className={cls("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold", tones[tone])}>{children}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-[var(--th-muted)]">
      <Loader2 size={28} className="animate-spin text-[var(--th-primary)]" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--th-radius)] border border-dashed border-black/10 p-10 text-center">
      <span className="text-[var(--th-muted)]">{icon ?? <Inbox size={32} />}</span>
      <p className="font-semibold text-[var(--th-text)]">{title}</p>
      {hint && <p className="text-sm text-[var(--th-muted)]">{hint}</p>}
    </div>
  );
}

// ── Modal / Drawer ───────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cls(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--th-surface)] text-[var(--th-text)] shadow-xl sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-[var(--th-surface)] px-5 py-3.5">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; body?: ReactNode; confirmLabel?: ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 text-sm text-[var(--th-muted)]">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
          <p>{body}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? "OK"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Toasts ───────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<{ toast: (message: string, tone?: "success" | "error") => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cls(
              "pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg",
              t.tone === "success" ? "bg-emerald-600" : "bg-red-600",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}

// ── Data table ───────────────────────────────────────────────────────────────

export interface Column<T> {
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({ rows, columns, keyOf, empty }: { rows: T[]; columns: Column<T>[]; keyOf: (row: T) => string; empty?: ReactNode }) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="—" />}</>;
  return (
    <div className="overflow-x-auto rounded-[var(--th-radius)] border border-black/5">
      <table className="w-full min-w-[640px] border-collapse bg-[var(--th-surface)] text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-black/[0.02] text-start">
            {columns.map((c, i) => (
              <th key={i} className={cls("px-4 py-3 text-start text-xs font-bold text-[var(--th-muted)]", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
              {columns.map((c, i) => (
                <td key={i} className={cls("px-4 py-3 align-middle", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
