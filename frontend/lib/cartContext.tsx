'use client';
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

export type PersonSizing = {
  label: string;
  gender?: string;
  sizes: Record<string, Record<string, string>>; // product_id → { size: 'L', color: 'Tan' }
};

export type CartItem = {
  id: string;
  type: 'product' | 'kit';
  name: string;
  image_url?: string | null;
  price_cents: number;
  quantity: number;
  shopify_variant_id?: string;
  // product-specific
  selectedColor?: string;
  selectedSize?: string;
  selectedVariants?: number[];
  // kit-specific
  removedItems?: string[];
  personSizes?: PersonSizing[];
  sizingComplete?: boolean;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  updateKitSizing: (index: number, personSizes: PersonSizing[]) => void;
  clearCart: () => void;
  totalCount: number;
  totalCents: number;
};

const STORAGE_KEY = 'cart';
const EMPTY_CART: CartItem[] = [];

function readStoredCart(): CartItem[] {
  try {
    const stored = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY_CART;
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

// ── Module-level store ────────────────────────────────────────────────────
// A single source of truth kept in sync with localStorage, exposed to
// components through useSyncExternalStore. Updates write to storage and
// notify subscribers in one place (no setState-in-effect hydration).

let cart: CartItem[] = readStoredCart();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function updateCart(updater: (prev: CartItem[]) => CartItem[]): void {
  const next = updater(cart);
  cart = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — keep in-memory state anyway.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartItem[] {
  return cart;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: CartItem) => {
    updateCart(prev => {
      if (item.type === 'product') {
        const existing = prev.find(i =>
          i.type === 'product' &&
          i.id === item.id &&
          i.selectedColor === item.selectedColor &&
          i.selectedSize === item.selectedSize &&
          JSON.stringify(i.selectedVariants) === JSON.stringify(item.selectedVariants)
        );
        if (existing) {
          return prev.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i);
        }
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    updateCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, qty: number) => {
    if (qty < 1) {
      removeItem(index);
      return;
    }
    updateCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }, [removeItem]);

  const updateKitSizing = useCallback((index: number, personSizes: PersonSizing[]) => {
    updateCart(prev => prev.map((item, i) =>
      i === index ? { ...item, personSizes, sizingComplete: true } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    updateCart(() => EMPTY_CART);
  }, []);

  const value = useMemo<CartContextType>(() => {
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    return { items, addItem, removeItem, updateQuantity, updateKitSizing, clearCart, totalCount, totalCents };
  }, [items, addItem, removeItem, updateQuantity, updateKitSizing, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
