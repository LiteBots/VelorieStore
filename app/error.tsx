'use client';

import Link from 'next/link';

export default function Error({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="err-page wrap">
      <span className="code-big grad">500</span>
      <h1 style={{ fontSize: 28 }}>Coś poszło nie tak</h1>
      <p className="muted">Spróbuj ponownie za chwilę. {error?.digest ? `Kod błędu: ${error.digest}` : ''}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={reset}>Spróbuj ponownie</button>
        <Link href="/" className="btn btn-ghost">Strona główna</Link>
      </div>
    </div>
  );
}
