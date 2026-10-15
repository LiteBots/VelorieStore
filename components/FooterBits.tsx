'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { newsletterAction, type FormState } from '@/lib/actions/public';
import { openCookieSettings } from './CookieBanner';
import { Honeypot, Submit } from './Forms';
import { useStore } from './Store';
import { Icon } from './Icon';

export function NewsletterForm() {
  const [state, run] = useActionState(newsletterAction, {} as FormState);
  const { toast } = useStore();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.msg) return;
    toast(state.msg, !state.ok);
    if (state.ok) ref.current?.reset();
  }, [state, toast]);
  return (
    <form ref={ref} className="news" action={run}>
      <Honeypot />
      <input name="email" type="email" placeholder="Twój e-mail" aria-label="E-mail do newslettera" required maxLength={120} />
      <Submit pending="…">Zapisz się</Submit>
    </form>
  );
}

export function CookieSettingsLink() {
  return <button onClick={openCookieSettings} style={{ color: 'inherit' }}>Ustawienia cookies</button>;
}

export function Announce() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try { setHidden(localStorage.getItem('velorie_ann') === '2026-jesien'); } catch { setHidden(false); }
  }, []);
  if (hidden) return null;
  return (
    <div className="announce" id="announce">
      <div className="wrap">
        <b>JESIEŃ 2026</b>
        <span>−20% na wszystkie skrypty FiveM i interiory MLO z kodem <code>JESIEN20</code> do 31 października</span>
        <button className="x" aria-label="Zamknij pasek" onClick={() => { setHidden(true); try { localStorage.setItem('velorie_ann', '2026-jesien'); } catch {} }}>
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
