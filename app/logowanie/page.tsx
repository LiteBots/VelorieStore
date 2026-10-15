import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { LoginButton } from '@/components/LoginButton';
import { Logo } from '@/components/Nav';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Logowanie', robots: { index: false } };

const ERRORS: Record<string, string> = {
  banned: 'To konto zostało zablokowane. Jeśli to pomyłka, napisz do nas przez formularz kontaktowy.',
  OAuthCallback: 'Logowanie przez Discord nie powiodło się. Spróbuj ponownie.',
  AccessDenied: 'Odmówiono dostępu.',
  Configuration: 'Logowanie nie jest jeszcze skonfigurowane (brak kluczy Discord OAuth).',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/panel';
  const user = await getUser().catch(() => null);
  if (user && !sp.error) redirect(next);
  const err = sp.error ? ERRORS[sp.error] || 'Wystąpił błąd logowania. Spróbuj ponownie.' : null;
  return (
    <div className="wrap view">
      <div className="auth-card">
        <span className="logo" style={{ fontSize: 22 }}><Logo /></span>
        <h1 style={{ fontSize: 28 }}>Zaloguj się do Velorie</h1>
        <p className="muted" style={{ fontSize: 14.5, maxWidth: '36ch' }}>Logujemy wyłącznie przez Discord. Nie przechowujemy Twojego hasła, a klucze licencji i zamówienia przypiszemy do Twojego konta.</p>
        {err && <div className="alert err" style={{ textAlign: 'left' }}>{err}</div>}
        <LoginButton next={next} label="Kontynuuj przez Discord" />
        <p className="muted" style={{ fontSize: 12.5 }}>Logując się, akceptujesz <Link href="/regulamin" style={{ color: 'var(--cyan)' }}>regulamin</Link> i <Link href="/polityka-prywatnosci" style={{ color: 'var(--cyan)' }}>politykę prywatności</Link>.</p>
      </div>
    </div>
  );
}
