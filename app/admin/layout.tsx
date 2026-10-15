import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { Application, Contact, Ticket } from '@/models';
import { SideNav } from '@/components/panel/SideNav';

export const metadata: Metadata = { title: 'Panel admina', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await db();
  const [apps, msgs, tickets] = await Promise.all([
    Application.countDocuments({ status: 'pending' }),
    Contact.countDocuments({ read: false }),
    Ticket.countDocuments({ status: 'open' }),
  ]);
  return (
    <div className="wrap view">
      <div className="dash">
        <SideNav
          who={{ name: admin.name, sub: 'Administrator', image: admin.image }}
          items={[
            { href: '/admin', label: 'Pulpit', icon: 'chart' },
            { href: '/admin/produkty', label: 'Produkty', icon: 'box' },
            { href: '/admin/zamowienia', label: 'Zamówienia', icon: 'receipt' },
            { href: '/admin/licencje', label: 'Licencje', icon: 'key' },
            { href: '/admin/uzytkownicy', label: 'Użytkownicy', icon: 'users' },
            { href: '/admin/kupony', label: 'Kupony', icon: 'tag' },
            { href: '/admin/zgloszenia', label: 'Zgłoszenia twórców', icon: 'upload', badge: apps },
            { href: '/admin/tickety', label: 'Tickety', icon: 'ticket', badge: tickets },
            { href: '/admin/wiadomosci', label: 'Wiadomości', icon: 'mail', badge: msgs },
            { href: '/admin/opinie', label: 'Opinie', icon: 'star' },
            { href: '/admin/logi', label: 'Logi', icon: 'flag' },
          ]}
        />
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}
