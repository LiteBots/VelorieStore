'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { applyAction, contactAction } from '@/lib/actions/public';
import { ActionForm, Honeypot, Submit } from './Forms';
import { LoginButton } from './LoginButton';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';

export function ContactForm() {
  return (
    <ActionForm action={contactAction} className="panel form" style={{ padding: 'clamp(18px,2.4vw,28px)' }}>
      <Honeypot />
      <div className="field"><label htmlFor="c-name">Imię lub nick</label><input id="c-name" name="name" required minLength={2} maxLength={60} autoComplete="name" /></div>
      <div className="field"><label htmlFor="c-email">E-mail</label><input id="c-email" name="email" type="email" required maxLength={120} autoComplete="email" /></div>
      <div className="field full">
        <label htmlFor="c-topic">Temat</label>
        <select id="c-topic" name="topic" defaultValue="zakup">
          <option value="zakup">Pytanie przed zakupem</option>
          <option value="licencja">Licencja i aktywacja</option>
          <option value="zwrot">Reklamacja lub zwrot</option>
          <option value="wspolpraca">Współpraca / sprzedaż na Velorie</option>
          <option value="inne">Inne</option>
        </select>
      </div>
      <div className="field full"><label htmlFor="c-msg">Wiadomość</label><textarea id="c-msg" name="message" required minLength={15} maxLength={3000} /></div>
      <label className="check field full">
        <input type="checkbox" name="consent" required />
        <span>Wyrażam zgodę na przetwarzanie moich danych w celu odpowiedzi na wiadomość zgodnie z <Link href="/polityka-prywatnosci">polityką prywatności</Link>.</span>
      </label>
      <div className="field full" style={{ alignItems: 'flex-start' }}><Submit className="btn btn-primary btn-lg">Wyślij wiadomość</Submit></div>
    </ActionForm>
  );
}

export function ApplyForm() {
  const { status } = useSession();
  const [studio, setStudio] = useState('');
  if (status !== 'authenticated') {
    return (
      <div className="panel stack" style={{ padding: 28, alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: 20 }}>Zaloguj się, aby wysłać zgłoszenie</h3>
        <p className="muted">Konto twórcy jest powiązane z Twoim kontem Discord — tam wyślemy decyzję i dostęp do kanału dla twórców.</p>
        <LoginButton next="/sprzedawaj#zgloszenie" />
      </div>
    );
  }
  return (
    <div className="sell-grid">
      <ActionForm action={applyAction} className="panel form" style={{ padding: 'clamp(18px,2.4vw,28px)' }}>
        <div className="field"><label htmlFor="a-studio">Nazwa studia lub nick</label><input id="a-studio" name="studio" required minLength={2} maxLength={40} value={studio} onChange={(e) => setStudio(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="a-plat">Główna platforma</label>
          <select id="a-plat" name="plat" defaultValue="fivem">
            <option value="minecraft">Minecraft</option><option value="fivem">FiveM</option><option value="other">Discord i web</option><option value="multi">Kilka platform</option>
          </select>
        </div>
        <div className="field full"><label htmlFor="a-port">Portfolio</label><input id="a-port" name="portfolio" type="url" required placeholder="https://github.com/…" maxLength={300} /><small>GitHub, YouTube, Behance albo strona z Twoimi projektami.</small></div>
        <div className="field full"><label htmlFor="a-about">Co chcesz sprzedawać?</label><textarea id="a-about" name="about" required minLength={30} maxLength={2000} placeholder="Np. 3 skrypty QBox: garaże, prace dorywcze, HUD. Każdy testowany na serwerze 200+ graczy." /></div>
        <label className="check field full">
          <input type="checkbox" name="terms" required />
          <span>Akceptuję <Link href="/regulamin#tworcy">regulamin dla twórców</Link> i oświadczam, że mam prawa do sprzedawanych materiałów.</span>
        </label>
        <div className="field full" style={{ alignItems: 'flex-start' }}><Submit className="btn btn-primary btn-lg">Wyślij do weryfikacji</Submit></div>
      </ActionForm>
      <div className="preview-sticky">
        <span className="eyebrow">Twoja wizytówka</span>
        <div className="seller-card" style={{ pointerEvents: 'none' }}>
          <span className="av" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', width: 46, height: 46, borderRadius: 13, fontSize: 17 }}>{(studio || 'T')[0].toUpperCase()}</span>
          <div><b>{studio || 'Twoje studio'}</b><small>Zweryfikowany twórca · 0 sprzedaży</small></div>
        </div>
        <div className="card" style={{ pointerEvents: 'none' }}>
          <div className="thumb"><ProductArt p={{ id: 'apply-preview', art: 'tablet', plat: 'fivem' }} /></div>
          <div className="card-body"><h3>Twój pierwszy produkt</h3><p className="desc">Tak będzie wyglądać karta w sklepie po publikacji.</p></div>
        </div>
      </div>
    </div>
  );
}

interface CheckRes {
  ok: boolean; found?: boolean; error?: string; status?: string; tier?: string; issued?: string; updatesUntil?: string | null;
  servers?: { used: number; max: number }; product?: { slug: string; name: string; version: string; art: string; cat: string; imageUrl: string | null } | null;
}

export function LicenseChecker() {
  const [key, setKey] = useState('');
  const [res, setRes] = useState<CheckRes | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch('/api/licenses/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
    setRes(await r.json().catch(() => ({ ok: false, error: 'Błąd sieci' })));
    setBusy(false);
  };
  return (
    <>
      <form className="lic-box" onSubmit={check}>
        <label className="search-in"><Icon name="key" /><input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="VLR-XXXX-XXXX-XXXX" aria-label="Klucz licencji" maxLength={18} autoComplete="off" spellCheck={false} /></label>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? 'Sprawdzam…' : 'Sprawdź klucz'}</button>
      </form>
      <div className="lic-res" aria-live="polite">
        {res && !res.ok && (
          <div className="lic-card" style={{ borderColor: 'rgba(251,113,133,.4)' }}><div className="lic-card-h"><span className="status bad">błąd</span><span className="muted" style={{ fontSize: 13.5 }}>{res.error}</span></div></div>
        )}
        {res?.ok && !res.found && (
          <div className="lic-card"><div className="lic-card-h"><span className="status bad">nie znaleziono</span><span className="muted" style={{ fontSize: 13.5 }}>Taki klucz nie istnieje. Sprawdź, czy nie pomyliłeś znaków.</span></div></div>
        )}
        {res?.ok && res.found && (
          <div className="lic-card">
            <div className="lic-card-h">
              {res.product && <ProductArt p={{ id: res.product.slug, art: res.product.art, plat: 'minecraft', imageUrl: res.product.imageUrl }} w={200} h={125} />}
              <div style={{ flex: 1, minWidth: 0 }}><b>{res.product?.name || 'Produkt usunięty'}</b><div className="muted" style={{ fontSize: 12.5 }}>v{res.product?.version}</div></div>
              <span className={`status ${res.status === 'active' ? 'ok' : 'bad'}`}>{res.status === 'active' ? 'aktywna' : 'unieważniona'}</span>
            </div>
            <dl>
              <dt>Licencja</dt><dd>{res.tier}</dd>
              <dt>Serwery</dt><dd>{res.servers?.used} / {res.servers && res.servers.max >= 999 ? 'bez limitu' : res.servers?.max}</dd>
              <dt>Wydana</dt><dd>{res.issued}</dd>
              <dt>Aktualizacje</dt><dd>{res.updatesUntil ? `do ${res.updatesUntil}` : 'dożywotnio'}</dd>
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
