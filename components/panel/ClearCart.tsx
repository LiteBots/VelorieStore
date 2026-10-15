'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../Store';

/** Po powrocie ze Stripe czyści koszyk. */
export function ClearCartOnSuccess() {
  const { clear } = useStore();
  useEffect(() => { clear(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Odświeża stronę zamówienia co 3 s, dopóki płatność oczekuje (webhook Stripe może dojść z opóźnieniem). */
export function AutoRefresh({ seconds = 3, max = 40 }: { seconds?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => { if (++n > max) clearInterval(t); else router.refresh(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, max]);
  return null;
}
