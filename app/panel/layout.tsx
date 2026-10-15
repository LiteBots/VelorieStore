import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { SideNav, type NavItem } from '@/components/panel/SideNav';

export const metadata: Metadata = { title: 'Panel klienta', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/panel');
  const items: NavItem[] = [
    { href: '/panel', label: 'Przegląd', icon: 'home' },
    { href: '/panel/zakupy', label: 'Moje zakupy', icon: 'box' },
    { href: '/panel/zamowienia', label: 'Zamówienia', icon: 'receipt' },
    { href: '/panel/tickety', label: 'Tickety', icon: 'ticket' },
    { href: '/panel/ustawienia', label: 'Ustawienia', icon: 'cog' },
  ];
  if (user.role === 'creator' || user.role === 'admin') items.push({ href: '/panel/tworca', label: 'Panel twórcy', icon: 'chart' });
  if (user.role === 'admin') items.push({ href: '/admin', label: 'Panel admina', icon: 'shield' });
  const roleName = user.role === 'admin' ? 'Administrator' : user.role === 'creator' ? 'Twórca' : 'Klient';
  return (
    <div className="wrap view">
      <div className="dash">
        <SideNav items={items} who={{ name: user.name, sub: roleName, image: user.image }} />
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}
