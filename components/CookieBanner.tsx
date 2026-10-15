'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Consent = { necessary: true; analytics: boolean; marketing: boolean; v: number; at: string };
const NAME = 'vlr_consent';
const VERSION = 1;

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=([^;]*)`));
  if (!m) return null;
  try {
    const c = JSON.parse(decodeURIComponent(m[1]));
    return c?.v === VERSION ? c : null;
  } catch {
    return null;
  }
}

/** Sprawdź zgodę przed załadowaniem skryptów analitycznych/marketingowych. */
export const hasConsent = (k: 'analytics' | 'marketing') => !!readConsent()?.[k];
export const openCookieSettings = () => window.dispatchEvent(new Event('vlr:cookies'));

function save(c: Omit<Consent, 'v' | 'at' | 'necessary'>) {
  const v: Consent = { necessary: true, ...c, v: VERSION, at: new Date().toISOString() };
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${NAME}=${encodeURIComponent(JSON.stringify(v))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('vlr:consent', { detail: v }));
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setShow(true);
    else { setAnalytics(c.analytics); setMarketing(c.marketing); }
    const open = () => { setShow(true); setCustom(true); };
    window.addEventListener('vlr:cookies', open);
    return () => window.removeEventListener('vlr:cookies', open);
  }, []);

  if (!show) return null;
  const done = (a: boolean, m: boolean) => { save({ analytics: a, marketing: m }); setShow(false); setCustom(false); };

  return (
    <div className="cookie" role="dialog" aria-label="Ustawienia plików cookie">
      <h3>Szanujemy Twoją prywatność 🍪</h3>
      <p>
        Używamy niezbędnych plików cookie (logowanie, koszyk, bezpieczeństwo). Za Twoją zgodą możemy też używać cookies analitycznych,
        żeby ulepszać sklep. Szczegóły w <Link href="/polityka-cookies">polityce cookies</Link> i <Link href="/polityka-prywatnosci">polityce prywatności</Link>.
      </p>
      {custom && (
        <div className="cookie-opt">
          <label className="toggle"><span>Niezbędne<small>Sesja, koszyk, ochrona przed nadużyciami — zawsze aktywne</small></span><span className="sw"><input type="checkbox" checked disabled /><i /></span></label>
          <label className="toggle"><span>Analityczne<small>Anonimowe statystyki odwiedzin</small></span><span className="sw"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /><i /></span></label>
          <label className="toggle"><span>Marketingowe<small>Mierzenie skuteczności kampanii</small></span><span className="sw"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><i /></span></label>
        </div>
      )}
      <div className="cookie-row">
        {custom ? (
          <button className="btn btn-primary" onClick={() => done(analytics, marketing)}>Zapisz wybór</button>
        ) : (
          <button className="btn btn-ghost" onClick={() => setCustom(true)}>Dostosuj</button>
        )}
        <button className="btn btn-ghost" onClick={() => done(false, false)}>Tylko niezbędne</button>
        <button className="btn btn-primary" onClick={() => done(true, true)}>Akceptuję wszystkie</button>
      </div>
    </div>
  );
}
