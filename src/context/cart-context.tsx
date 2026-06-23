"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartItem, Product } from "@/types/product";
import { cartLineKey } from "@/lib/catalog/variants";

interface AddItemOptions {
  quantity?: number;
  variantId?: string;
  variantLabel?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, options?: AddItemOptions) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "trove-cart";
const LEGACY_STORAGE_KEY = "techdrop-us-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (stored) localStorage.setItem(STORAGE_KEY, stored);
      }
      if (stored) setItems(JSON.parse(stored));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, options: AddItemOptions = {}) => {
    const quantity = options.quantity ?? 1;
    const variantId = options.variantId ?? product.cjVid;
    const lineKey = cartLineKey(product.id, variantId);

    setItems((current) => {
      const existing = current.find(
        (i) => cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) === lineKey,
      );
      if (existing) {
        return current.map((i) =>
          cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) === lineKey
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...current,
        {
          product,
          quantity,
          variantId,
          variantLabel: options.variantLabel,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((current) =>
      current.filter(
        (i) => cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) !== lineKey,
      ),
    );
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) =>
        current.filter(
          (i) => cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) !== lineKey,
        ),
      );
      return;
    }
    setItems((current) =>
      current.map((i) =>
        cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) === lineKey
          ? { ...i, quantity }
          : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
