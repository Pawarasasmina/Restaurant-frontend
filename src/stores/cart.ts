import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, Option } from "../types";
export type CartLine = {
  key: string;
  item: MenuItem;
  quantity: number;
  variant?: Option;
  extras: Option[];
  notes?: string;
};
type CartStore = {
  sessionKey: string;
  lines: CartLine[];
  setSession: (key: string) => void;
  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
};
export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      sessionKey: "",
      lines: [],
      setSession: (key) =>
        set((s) => (s.sessionKey === key ? s : { sessionKey: key, lines: [] })),
      add: (line) => set((s) => ({ lines: [...s.lines, line] })),
      remove: (key) =>
        set((s) => ({ lines: s.lines.filter((x) => x.key !== key) })),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines:
            quantity < 1
              ? s.lines.filter((x) => x.key !== key)
              : s.lines.map((x) => (x.key === key ? { ...x, quantity } : x)),
        })),
      clear: () => set({ lines: [] }),
      total: () =>
        get().lines.reduce(
          (a, l) =>
            a +
            (Math.round(
              (l.item.basePrice * (10000 - l.item.discountBps)) / 10000,
            ) +
              (l.variant?.priceDelta || 0) +
              l.extras.reduce((s, e) => s + e.priceDelta, 0)) *
              l.quantity,
          0,
        ),
    }),
    { name: "restaurant-cart" },
  ),
);
