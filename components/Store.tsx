'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem } from '@/lib/types';
import type { LicId } from '@/lib/catalog';
import { licOf } from '@/lib/catalog';
import { Icon } from './Icon';

interface Toast { id: number; text: string; err?: boolean; out?: boolean }
interface StoreCtx {
  cart: CartItem[];
  add: (item: CartItem) => void;
  remove: (i: number) => void;
  setLic: (i: number, lic: LicId) => void;
  clear: () => void;
  wish: string[];
  toggleWish: (slug: string) => void;
  coupon: string | null;
  setCoupon: (c: string | null) => void;
  toast: (text: string, err?: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  palOpen: boolean;
  setPalOpen: (v: boolean) => void;
  bump: number;
}

const Ctx = createContext<StoreCtx | null>(null);

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem('velorie_' + k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem('velorie_' + k, JSON.stringify(v));
  } catch {}
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wish, setWish] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [palOpen, setPalOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const loaded = useRef(false);
  const tid = useRef(0);

  useEffect(() => {
    const c = read<CartItem[]>('cart', []);
    setCart(Array.isArray(c) ? c.filter((x) => x && typeof x.slug === 'string') : []);
    setWish(read<string[]>('wish', []));
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) write('cart', cart); }, [cart]);
  useEffect(() => { if (loaded.current) write('wish', wish); }, [wish]);

  const toast = useCallback((text: string, err?: boolean) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 2600);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2860);
  }, []);

  const add = useCallback((item: CartItem) => {
    const i = cart.findIndex((x) => x.slug === item.slug);
    if (i >= 0) {
      if (cart[i].lic === item.lic) {
        toast('Ten produkt jest już w koszyku');
        setCartOpen(true);
        return;
      }
      setCart((c) => c.map((x) => (x.slug === item.slug ? { ...x, lic: item.lic } : x)));
      toast(`Zmieniono licencję: ${item.name} → ${licOf(item.lic).name}`);
      return;
    }
    setCart((c) => (c.some((x) => x.slug === item.slug) ? c : [...c, item]));
    toast(`Dodano do koszyka: ${item.name}`);
    setBump((b) => b + 1);
  }, [cart, toast]);

  const value = useMemo<StoreCtx>(() => ({
    cart,
    add,
    remove: (i) => setCart((c) => c.filter((_, j) => j !== i)),
    setLic: (i, lic) => setCart((c) => c.map((x, j) => (j === i ? { ...x, lic } : x))),
    clear: () => { setCart([]); setCoupon(null); },
    wish,
    toggleWish: (slug) => {
      const on = wish.includes(slug);
      toast(on ? 'Usunięto z ulubionych' : 'Dodano do ulubionych');
      setWish((w) => (on ? w.filter((x) => x !== slug) : w.includes(slug) ? w : [...w, slug]));
    },
    coupon,
    setCoupon,
    toast,
    cartOpen,
    setCartOpen,
    palOpen,
    setPalOpen,
    bump,
  }), [cart, add, wish, coupon, toast, cartOpen, palOpen, bump]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.err ? ' err' : ''}${t.out ? ' out' : ''}`}>
            <i><Icon name={t.err ? 'x' : 'check'} /></i>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore poza StoreProvider');
  return c;
}
