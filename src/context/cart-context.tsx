"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getProductBySlug } from "@/data/products";
import { applyVariant, cartLineKey } from "@/lib/catalog/variants";
import { roundUsd } from "@/lib/pricing";
import { CartItem, Product } from "@/types/product";

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

/** Refresh snapshot from live catalog so images/prices never go stale. */
function refreshCartItem(item: CartItem): CartItem | null {
  const slug = item.product?.slug?.trim();
  if (!slug) return item;

  const live = getProductBySlug(slug);
  if (!live) return item;

  const variantId = item.variantId ?? live.cjVid;
  const product = applyVariant(live, variantId);
  return {
    ...item,
    product,
    variantId,
    variantLabel: item.variantLabel,
  };
}

function refreshCartItems(items: CartItem[]): CartItem[] {
  return items
    .map(refreshCartItem)
    .filter((item): item is CartItem => Boolean(item?.product?.id));
}

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
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(refreshCartItems(Array.isArray(parsed) ? parsed : []));
      }
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
    const live = getProductBySlug(product.slug) ?? product;
    const snapshot = applyVariant(live, variantId);

    setItems((current) => {
      const existing = current.find(
        (i) => cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) === lineKey,
      );
      if (existing) {
        return current.map((i) =>
          cartLineKey(i.product.id, i.variantId ?? i.product.cjVid) === lineKey
            ? { ...i, product: snapshot, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...current,
        {
          product: snapshot,
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
    () =>
      roundUsd(
        items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      ),
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
