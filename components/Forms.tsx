'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/actions/public';

/** Przycisk z blokadą podczas wysyłania formularza. */
export function Submit({ children, className = 'btn btn-primary', pending = 'Wysyłanie…', style }: { children: React.ReactNode; className?: string; pending?: string; style?: React.CSSProperties }) {
  const { pending: p } = useFormStatus();
  return <button type="submit" className={className} disabled={p} style={style}>{p ? pending : children}</button>;
}

export function FormMsg({ state }: { state: FormState }) {
  if (!state?.msg) return null;
  return <div className={`alert ${state.ok ? 'ok' : 'err'}`} role="status">{state.msg}</div>;
}

/** Ukryte pole-pułapka na boty (honeypot). */
export const Honeypot = () => (
  <label className="hp" aria-hidden="true">Strona WWW<input name="website" tabIndex={-1} autoComplete="off" /></label>
);

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

/**
 * Formularz oparty o server action z komunikatem zwrotnym.
 * resetOnOk — czyści pola po sukcesie.
 */
export function ActionForm({ action, children, className, style, resetOnOk = true }: { action: Action; children: React.ReactNode; className?: string; style?: React.CSSProperties; resetOnOk?: boolean }) {
  const [state, run] = useActionState(action, {} as FormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnOk) ref.current?.reset(); }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className} style={style} noValidate={false}>
      {children}
      <FormMsg state={state} />
    </form>
  );
}
