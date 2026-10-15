'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export type PersonSizing = {
  label: string;
  gender?: string;
  sizes: Record<string, Record<string, string>>; // product_id → { size: 'L', color: 'Tan' }
};

export type CartItem = {
  id: string;
  type: 'product' | 'kit';
  name: string;
  image_url?: string;
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

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  function addItem(item: CartItem) {
    setItems(prev => {
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
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, qty: number) {
    if (qty < 1) return removeItem(index);
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }

  function updateKitSizing(index: number, personSizes: PersonSizing[]) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, personSizes, sizingComplete: true } : item
    ));
  }

  function clearCart() {
    setItems([]);
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, updateKitSizing, clearCart, totalCount, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
