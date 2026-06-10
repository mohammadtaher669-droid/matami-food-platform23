import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartAddon {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
}

export interface CartLine {
  uid: string;
  productId: string;
  name_en: string;
  name_ar: string;
  imageUrl: string;
  basePrice: number;
  variantId?: string;
  variantName_en?: string;
  variantName_ar?: string;
  variantDelta: number;
  addons: CartAddon[];
  qty: number;
  notes: string;
}

export function lineUnitPrice(line: CartLine): number {
  return line.basePrice + line.variantDelta + line.addons.reduce((s, a) => s + a.price, 0);
}

interface CartContextValue {
  /** cart is per restaurant slug */
  slug: string | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  addLine: (slug: string, line: Omit<CartLine, "uid">) => void;
  updateQty: (uid: string, qty: number) => void;
  removeLine: (uid: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface StoredCart {
  slug: string;
  lines: CartLine[];
}

function load(): StoredCart | null {
  try {
    const raw = localStorage.getItem("matami_cart");
    return raw ? (JSON.parse(raw) as StoredCart) : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoredCart | null>(load);

  useEffect(() => {
    if (cart) localStorage.setItem("matami_cart", JSON.stringify(cart));
    else localStorage.removeItem("matami_cart");
  }, [cart]);

  const addLine = useCallback((slug: string, line: Omit<CartLine, "uid">) => {
    setCart((prev) => {
      const base = prev && prev.slug === slug ? prev : { slug, lines: [] };
      // merge identical compositions
      const sig = (l: Omit<CartLine, "uid" | "qty">) =>
        JSON.stringify([l.productId, l.variantId, l.addons.map((a) => a.id).sort(), l.notes]);
      const existing = base.lines.find((l) => sig(l) === sig(line));
      if (existing) {
        return { ...base, lines: base.lines.map((l) => (l.uid === existing.uid ? { ...l, qty: l.qty + line.qty } : l)) };
      }
      return { ...base, lines: [...base.lines, { ...line, uid: crypto.randomUUID() }] };
    });
  }, []);

  const updateQty = useCallback((uid: string, qty: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (qty <= 0) {
        const lines = prev.lines.filter((l) => l.uid !== uid);
        return lines.length ? { ...prev, lines } : null;
      }
      return { ...prev, lines: prev.lines.map((l) => (l.uid === uid ? { ...l, qty } : l)) };
    });
  }, []);

  const removeLine = useCallback((uid: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.filter((l) => l.uid !== uid);
      return lines.length ? { ...prev, lines } : null;
    });
  }, []);

  const clear = useCallback(() => setCart(null), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = cart?.lines ?? [];
    return {
      slug: cart?.slug ?? null,
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: Math.round(lines.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0) * 100) / 100,
      addLine,
      updateQty,
      removeLine,
      clear,
    };
  }, [cart, addLine, updateQty, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
