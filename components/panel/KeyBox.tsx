'use client';

import { useState } from 'react';

export function KeyBox({ value, masked }: { value: string; masked?: boolean }) {
  const [show, setShow] = useState(!masked);
  const [done, setDone] = useState('');
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => setDone('Skopiowano'), () => setDone('Zaznacz ręcznie'));
    setTimeout(() => setDone(''), 1400);
  };
  return (
    <div className="keybox" style={{ width: '100%' }}>
      <span style={{ flex: 1 }}>{show ? value : value.replace(/[A-Z0-9](?=.{5})/g, '•')}</span>
      {masked && <button type="button" onClick={() => setShow(!show)}>{show ? 'Ukryj' : 'Pokaż'}</button>}
      <button type="button" onClick={copy}>{done || 'Kopiuj'}</button>
    </div>
  );
}
