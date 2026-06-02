import { createContext, useContext, useEffect, useState } from "react";
import type { ModifierOption, AddOn } from "@/lib/store";

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ar: string;
  price: number;
  category_id: string;
  description_en: string;
  description_ar: string;
  popular?: boolean;
  image?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  restaurantId: string;
  branchId: string;
  selectedOptions?: Record<string, ModifierOption[]>;
  selectedAddOns?: AddOn[];
  customerNote?: string;
  cartKey?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    item: MenuItem,
    restaurantId: string,
    branchId: string,
    selectedOptions?: Record<string, ModifierOption[]>,
    selectedAddOns?: AddOn[],
    customerNote?: string
  ) => "added" | "confirm_clear";
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;
  cartCount: number;
  cartTotal: number;
  selectedRestaurantId: string | null;
  selectedBranchId: string | null;
  pendingAdd: {
    item: MenuItem;
    restaurantId: string;
    branchId: string;
    selectedOptions?: Record<string, ModifierOption[]>;
    selectedAddOns?: AddOn[];
    customerNote?: string;
  } | null;
  confirmClearAndAdd: () => void;
  cancelPendingAdd: () => void;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  addToCart: () => "added",
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  replaceCart: () => {},
  cartCount: 0,
  cartTotal: 0,
  selectedRestaurantId: null,
  selectedBranchId: null,
  pendingAdd: null,
  confirmClearAndAdd: () => {},
  cancelPendingAdd: () => {},
});

function computeItemPrice(ci: CartItem): number {
  let price = ci.item.price;
  if (ci.selectedOptions) {
    for (const opts of Object.values(ci.selectedOptions)) {
      for (const opt of opts) {
        price += opt.price_addition;
      }
    }
  }
  if (ci.selectedAddOns) {
    for (const addOn of ci.selectedAddOns) {
      if (!addOn.is_free) price += addOn.price;
    }
  }
  return price;
}

function makeCartKey(
  itemId: string,
  selectedOptions?: Record<string, ModifierOption[]>,
  selectedAddOns?: AddOn[],
  customerNote?: string
): string {
  const opts = selectedOptions
    ? Object.entries(selectedOptions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([gid, opts]) => `${gid}:${opts.map((o) => o.id).sort().join(",")}`)
        .join("|")
    : "";
  const addons = selectedAddOns ? selectedAddOns.map((a) => a.id).sort().join(",") : "";
  const note = customerNote || "";
  return `${itemId}__${opts}__${addons}__${note}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });
  const [pendingAdd, setPendingAdd] = useState<CartContextType["pendingAdd"]>(null);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const selectedRestaurantId = cartItems.length > 0 ? cartItems[0].restaurantId : null;
  const selectedBranchId = cartItems.length > 0 ? cartItems[0].branchId : null;

  const addToCart = (
    item: MenuItem,
    restaurantId: string,
    branchId: string,
    selectedOptions?: Record<string, ModifierOption[]>,
    selectedAddOns?: AddOn[],
    customerNote?: string
  ): "added" | "confirm_clear" => {
    if (cartItems.length > 0 && (cartItems[0].restaurantId !== restaurantId || cartItems[0].branchId !== branchId)) {
      setPendingAdd({ item, restaurantId, branchId, selectedOptions, selectedAddOns, customerNote });
      return "confirm_clear";
    }
    const cartKey = makeCartKey(item.id, selectedOptions, selectedAddOns, customerNote);
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.cartKey === cartKey);
      if (existing) {
        return prev.map((ci) => ci.cartKey === cartKey ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1, restaurantId, branchId, selectedOptions, selectedAddOns, customerNote, cartKey }];
    });
    return "added";
  };

  const confirmClearAndAdd = () => {
    if (!pendingAdd) return;
    const { item, restaurantId, branchId, selectedOptions, selectedAddOns, customerNote } = pendingAdd;
    const cartKey = makeCartKey(item.id, selectedOptions, selectedAddOns, customerNote);
    setCartItems([{ item, quantity: 1, restaurantId, branchId, selectedOptions, selectedAddOns, customerNote, cartKey }]);
    setPendingAdd(null);
  };

  const cancelPendingAdd = () => setPendingAdd(null);

  const removeFromCart = (cartKey: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.cartKey !== cartKey && ci.item.id !== cartKey));
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCartItems((prev) =>
      prev.map((ci) =>
        (ci.cartKey === cartKey || ci.item.id === cartKey) ? { ...ci, quantity } : ci
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const replaceCart = (items: CartItem[]) => {
    const normalized = items.map((ci) => ({
      ...ci,
      cartKey: makeCartKey(ci.item.id, ci.selectedOptions, ci.selectedAddOns, ci.customerNote),
    }));
    setCartItems(normalized);
  };

  const cartCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartTotal = cartItems.reduce((sum, ci) => sum + computeItemPrice(ci) * ci.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, replaceCart,
      cartCount, cartTotal, selectedRestaurantId, selectedBranchId,
      pendingAdd, confirmClearAndAdd, cancelPendingAdd
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
