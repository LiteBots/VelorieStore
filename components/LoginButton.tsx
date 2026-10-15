'use client';

import { signIn, useSession } from 'next-auth/react';
import { Icon } from './Icon';

export function LoginButton({ className = 'btn btn-discord btn-lg', label = 'Zaloguj przez Discord', next, hideWhenLogged }: { className?: string; label?: string; next?: string; hideWhenLogged?: boolean }) {
  const { status } = useSession();
  if (hideWhenLogged && status === 'authenticated') return null;
  return (
    <button className={className} onClick={() => signIn('discord', { callbackUrl: next || window.location.pathname })}>
      <Icon name="discord" />{label}
    </button>
  );
}
