"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string, variant?: string) => void;
  updateQuantity: (id: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
}

function itemKey(id: string, variant?: string) {
  return `${id}::${variant ?? ""}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (incoming) =>
        set((state) => {
          const key = itemKey(incoming.id, incoming.variant);
          const existing = state.items.find(
            (i) => itemKey(i.id, i.variant) === key
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                itemKey(i.id, i.variant) === key
                  ? { ...i, quantity: i.quantity + (incoming.quantity ?? 1) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...incoming, quantity: incoming.quantity ?? 1 },
            ],
          };
        }),

      removeItem: (id, variant) =>
        set((state) => ({
          items: state.items.filter(
            (i) => itemKey(i.id, i.variant) !== itemKey(id, variant)
          ),
        })),

      updateQuantity: (id, quantity, variant) =>
        set((state) => {
          const key = itemKey(id, variant);
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => itemKey(i.id, i.variant) !== key),
            };
          }
          return {
            items: state.items.map((i) =>
              itemKey(i.id, i.variant) === key ? { ...i, quantity } : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    { name: "sufra-cart" }
  )
);

// Selectors kept outside store to avoid stale closures
export const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectItemCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);
