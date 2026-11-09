"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { Toaster } from "@/components/ui/sonner";

type CartCountStore = {
  count: number;
  setCount: (next: number) => void;
  previewCount: (next: number) => void;
  adoptServerCount: (next: number) => void;
};

const listeners = new Set<() => void>();
let memoryCount = 0;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getMemoryCount() {
  return memoryCount;
}

function setMemoryCount(next: number) {
  memoryCount = next;
  for (const listener of listeners) listener();
}

const memoryStore: CartCountStore = {
  get count() {
    return memoryCount;
  },
  setCount: setMemoryCount,
  previewCount: setMemoryCount,
  adoptServerCount: setMemoryCount,
};

const CartCountContext = createContext<CartCountStore | null>(null);

export function CartProvider({
  count: initialCount = 0,
  children,
}: {
  count?: number;
  children: React.ReactNode;
}) {
  const [count, setCountState] = useState(initialCount);
  const [edited, setEdited] = useState(false);
  const [tracked, setTracked] = useState(initialCount);
  if (initialCount !== tracked) {
    setTracked(initialCount);
    if (!edited) setCountState(initialCount);
  }

  const setCount = useCallback((next: number) => {
    setEdited(true);
    setCountState(next);
  }, []);

  const adoptServerCount = useCallback((next: number) => {
    if (edited) return;
    setCountState(next);
  }, [edited]);

  const value = useMemo(
    () => ({ count, setCount, previewCount: setCount, adoptServerCount }),
    [adoptServerCount, count, setCount],
  );

  return <CartCountContext.Provider value={value}>{children}</CartCountContext.Provider>;
}

export function useCartCount(): CartCountStore {
  const provided = useContext(CartCountContext);
  useSyncExternalStore(subscribe, getMemoryCount, getMemoryCount);
  if (provided) return provided;
  return memoryStore;
}

export function CartToaster() {
  const provided = useContext(CartCountContext);
  if (provided) return null;
  return <Toaster />;
}
