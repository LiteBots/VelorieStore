'use client';

import { SessionProvider } from 'next-auth/react';
import { StoreProvider } from './Store';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
