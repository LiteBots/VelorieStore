'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { LIC, licOf, zl, type LicId } from '@/lib/catalog';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { useStore } from './Store';

interface QuoteRes {
  ok: boolean; subtotal: number; discount: number; total: number; coupon: string | null; couponError: string | null; couponLabel: string | null;
  payments: 'stripe' | 'demo' | 'off'; lines: { slug: string; price: number }[]; error?: string;
}
interface DemoOrder { orderId: string; number: string; total: number; lines: { name: string; license: string; price: number }[]; discount: number }
interface Key { slug: string; name: string; tier: string; key: string }

const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false, error: 'Błąd sieci' }));
  return { status: r.status, ...j };
};

function Stepper({ n }: { n: number }) {
  return (
    <div className="stepper">
      {['Płatność', 'Potwierdzenie', 'Licencje'].map((l, i) => (
        <span key={l} style={{ display: 'contents' }}>
          {i > 0 && <hr />}
          <span className={i < n ? 'done' : i === n ? 'on' : ''}><i>{i < n ? '✓' : i + 1}</i>{l}</span>
        </span>
      ))}
    </div>
  );
}

export function CartDrawer() {
  const { cart, remove, setLic, clear, coupon, setCoupon, toast, cartOpen, setCartOpen } = useStore();
  const { status } = useSession();
  const [q, setQ] = useState<QuoteRes | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [modal, setModal] = useState<null | { step: number; order?: DemoOrder; keys?: Key[] }>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Wycena zawsze z serwera (ceny w przeglądarce są tylko orientacyjne).
  useEffect(() => {
    if (!cart.length) { setQ(null); return; }
    const t = setTimeout(async () => {
      const r = await post('/api/checkout/quote', { items: cart.map((c) => ({ slug: c.slug, lic: c.lic })), coupon });
      if (r.ok) {
        setQ(r);
        if (coupon && r.couponError) { toast(r.couponError, true); setCoupon(null); }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [cart, coupon, toast, setCoupon]);

  useEffect(() => { setCode(coupon || ''); }, [coupon]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCartOpen(false); setModal((m) => (m && m.step === 1 ? null : m)); } };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [setCartOpen]);

  const linePrice = (slug: string, base: number, lic: string) => q?.lines.find((l) => l.slug === slug)?.price ?? Math.round(base * licOf(lic).mult);

  const checkout = async () => {
    if (status !== 'authenticated') {
      toast('Zaloguj się przez Discord, aby dokończyć zakup');
      signIn('discord', { callbackUrl: window.location.pathname });
      return;
    }
    if (!terms) { toast('Zaznacz akceptację regulaminu i zgodę na dostarczenie treści cyfrowej', true); return; }
    setBusy(true);
    const r = await post('/api/checkout', { items: cart.map((c) => ({ slug: c.slug, lic: c.lic })), coupon, terms });
    setBusy(false);
    if (!r.ok) { toast(r.error || 'Nie udało się utworzyć zamówienia', true); return; }
    if (r.mode === 'stripe' && r.url) { window.location.href = r.url; return; }
    setCartOpen(false);
    setOtp(['', '', '', '', '', '']);
    setModal({ step: 1, order: r as DemoOrder });
    setTimeout(() => otpRefs.current[0]?.focus(), 60);
  };

  const pay = async () => {
    if (!modal?.order) return;
    setModal({ ...modal, step: 2 });
    const r = await post('/api/checkout/demo', { orderId: modal.order.orderId, code: otp.join('') });
    if (!r.ok) { toast(r.error || 'Płatność odrzucona', true); setModal({ ...modal, step: 1 }); return; }
    clear();
    setModal({ step: 3, order: modal.order, keys: r.keys });
  };

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).then(() => toast('Skopiowano klucz'), () => toast('Zaznacz i skopiuj ręcznie', true));
  };

  return (
    <>
      <div className={`scrim ${cartOpen ? 'on' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? 'on' : ''}`} aria-label="Koszyk" aria-hidden={!cartOpen}>
        <div className="drawer-h">
          <h3>Koszyk <span className="pill">{cart.length}</span></h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Zamknij koszyk"><Icon name="x" /></button>
        </div>
        <div className="drawer-b">
          {!cart.length ? (
            <div className="empty" style={{ marginTop: 12 }}>
              <span className="ico"><Icon name="cart" /></span>
              <b>Koszyk jest pusty</b>
              <span>Dodaj plugin, skrypt albo mapę ze sklepu.</span>
              <Link href="/sklep" className="btn btn-ghost" onClick={() => setCartOpen(false)}>Przejdź do sklepu</Link>
            </div>
          ) : (
            cart.map((c, i) => (
              <div className="ci" key={c.slug}>
                <ProductArt p={{ id: c.slug, art: c.art, plat: c.plat, imageUrl: c.imageUrl }} w={200} h={125} />
                <div style={{ minWidth: 0 }}>
                  <b>{c.name}</b>
                  <select value={c.lic} onChange={(e) => setLic(i, e.target.value as LicId)} aria-label={`Licencja dla ${c.name}`}>
                    {LIC.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b className="tnum">{zl(linePrice(c.slug, c.price, c.lic))}</b>
                  <button className="rm" onClick={() => remove(i)}>Usuń</button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="drawer-f">
            <form className="coupon" onSubmit={(e) => { e.preventDefault(); const v = code.trim().toUpperCase(); setCoupon(v || null); if (v) toast(`Sprawdzam kod ${v}…`); }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kod rabatowy" aria-label="Kod rabatowy" maxLength={24} />
              <button className="btn btn-ghost" style={{ height: 42 }}>Użyj</button>
            </form>
            <div className="sum"><span>Wartość produktów</span><span>{zl(q?.subtotal ?? cart.reduce((a, c) => a + linePrice(c.slug, c.price, c.lic), 0))}</span></div>
            {q?.coupon && q.discount > 0 && (
              <div className="sum disc"><span>{q.coupon} · {q.couponLabel}</span><span>−{zl(q.discount)}</span></div>
            )}
            <div className="sum tot"><span>Do zapłaty</span><span>{zl(q?.total ?? 0)}</span></div>
            <label className="check" style={{ fontSize: 12.5 }}>
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>
                Akceptuję <Link href="/regulamin" onClick={() => setCartOpen(false)}>regulamin</Link> i żądam dostarczenia treści cyfrowej przed upływem terminu na odstąpienie od umowy.
                Przyjmuję do wiadomości, że tracę prawo odstąpienia od umowy (gwarancja działania 14 dni obowiązuje nadal).
              </span>
            </label>
            <button className="btn btn-primary btn-lg" onClick={checkout} disabled={busy || q?.payments === 'off'}>
              {busy ? 'Tworzę zamówienie…' : q?.payments === 'off' ? 'Płatności wkrótce' : status === 'authenticated' ? <>Przejdź do płatności <Icon name="arrow" /></> : <><Icon name="discord" />Zaloguj i zapłać</>}
            </button>
            <span className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
              BLIK · Przelewy24 · karta · {q?.payments === 'demo' ? 'tryb testowy' : 'bezpieczna płatność Stripe'}
            </span>
          </div>
        )}
      </aside>

      <div className={`modal ${modal ? 'on' : ''}`} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && modal?.step !== 2) setModal(null); }}>
        <div className="modal-box">
          {modal?.step === 1 && modal.order && (
            <>
              <Stepper n={1} />
              <div style={{ textAlign: 'center' }}>
                <h3>Wpisz kod BLIK</h3>
                <p className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>Zamówienie {modal.order.number} · {zl(modal.order.total)}. Tryb testowy: dowolne 6 cyfr.</p>
              </div>
              <div className="otp" onPaste={(e) => {
                const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                if (d) { e.preventDefault(); setOtp(d.padEnd(6, ' ').split('').map((x) => x.trim())); }
              }}>
                {otp.map((v, i) => (
                  <input key={i} ref={(el) => { otpRefs.current[i] = el; }} inputMode="numeric" maxLength={1} aria-label={`Cyfra ${i + 1} kodu`} value={v}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '');
                      setOtp((o) => o.map((x, j) => (j === i ? d : x)));
                      if (d) otpRefs.current[i + 1]?.focus();
                    }}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !v) otpRefs.current[i - 1]?.focus(); }}
                  />
                ))}
              </div>
              <button className="btn btn-primary btn-lg" disabled={otp.some((x) => !x)} onClick={pay}>Zapłać {zl(modal.order.total)}</button>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Anuluj</button>
            </>
          )}
          {modal?.step === 2 && (
            <>
              <Stepper n={1} />
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" />
                <h3>Czekamy na potwierdzenie w aplikacji</h3>
                <p className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>To potrwa chwilę.</p>
              </div>
            </>
          )}
          {modal?.step === 3 && (
            <>
              <Stepper n={2} />
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="success-ico"><Icon name="check" /></span>
                <h3>Płatność przyjęta</h3>
                <p className="muted" style={{ fontSize: 14 }}>Zapłacono {zl(modal.order?.total || 0)}. Klucze są też w Twojej bibliotece zakupów.</p>
              </div>
              {(modal.keys || []).map((k) => (
                <div key={k.key}>
                  <b style={{ fontSize: 13.5 }}>{k.name} <span className="muted" style={{ fontWeight: 500 }}>· {k.tier}</span></b>
                  <div className="keybox" style={{ width: '100%' }}><span style={{ flex: 1 }}>{k.key}</span><button onClick={() => copy(k.key)}>Kopiuj</button></div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Zamknij</button>
                <Link href="/panel/zakupy" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setModal(null)}>Moje zakupy</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
