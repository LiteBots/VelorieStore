import Link from 'next/link';
import { db } from '@/lib/db';
import { License, Order, Product, User } from '@/models';
import { dailyRevenue } from '@/lib/analytics';
import { licOf, num, zl } from '@/lib/catalog';
import { loadDemoData } from '@/lib/actions/admin';
import { paymentsMode } from '@/lib/orders';
import { RevenueChart } from '@/components/admin/Chart';
import { AdminTop } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';
import { Icon } from '@/components/Icon';

export default async function AdminHome() {
  await db();
  const since = new Date(Date.now() - 30 * 864e5);
  const [daily, users, newUsers, lics, products, orders30, recent, pending] = await Promise.all([
    dailyRevenue(30),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    License.countDocuments({ status: 'active' }),
    Product.countDocuments(),
    Order.countDocuments({ status: 'paid', paidAt: { $gte: since } }),
    Order.find().sort({ createdAt: -1 }).limit(8).lean<any[]>(),
    Order.countDocuments({ status: 'pending' }),
  ]);
  const rev = daily.reduce((a, d) => a + d.value, 0);
  const mode = paymentsMode();
  return (
    <>
      <AdminTop title="Pulpit">
        <Link href="/admin/produkty/nowy" className="btn btn-primary"><Icon name="plus" />Nowy produkt</Link>
      </AdminTop>
      {mode !== 'stripe' && (
        <div className={`alert ${mode === 'demo' ? 'info' : 'err'}`} style={{ marginBottom: 12 }}>
          {mode === 'demo'
            ? 'Płatności działają w trybie testowym (ALLOW_DEMO_PAYMENTS=true). Przed startem ustaw STRIPE_SECRET_KEY i wyłącz tryb testowy.'
            : 'Płatności są wyłączone. Ustaw STRIPE_SECRET_KEY i STRIPE_WEBHOOK_SECRET w Railway → Variables.'}
        </div>
      )}
      <div className="kpis">
        <div className="kpi"><span><Icon name="wallet" />Przychód · 30 dni</span><b>{zl(rev)}</b><span className="delta" style={{ color: 'var(--muted)' }}>prowizja 15%: {zl(rev * 0.15)}</span></div>
        <div className="kpi"><span><Icon name="receipt" />Opłacone · 30 dni</span><b>{num(orders30)}</b><span className="delta" style={{ color: 'var(--muted)' }}>{pending} oczekujących</span></div>
        <div className="kpi"><span><Icon name="users" />Użytkownicy</span><b>{num(users)}</b><span className="delta">+{newUsers} w 30 dni</span></div>
        <div className="kpi"><span><Icon name="key" />Aktywne licencje</span><b>{num(lics)}</b><span className="delta" style={{ color: 'var(--muted)' }}>{products} produktów</span></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-h"><h3>Przychód dzienny</h3><span className="muted mono" style={{ fontSize: 11.5 }}>ostatnie 30 dni</span></div>
        <RevenueChart data={daily} />
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-h"><h3>Ostatnie zamówienia</h3><Link href="/admin/zamowienia" className="btn btn-sm btn-ghost">Wszystkie <Icon name="arrow" /></Link></div>
        {recent.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Zamówienie</th><th>Klient</th><th>Produkty</th><th>Data</th><th className="num">Kwota</th><th>Status</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={String(o._id)}>
                <td className="mono">{o.number}</td><td>{o.username}</td>
                <td>{o.items.map((i: any) => `${i.name} (${licOf(i.license).name})`).join(', ')}</td>
                <td className="mono muted">{new Date(o.createdAt).toLocaleString('pl-PL')}</td>
                <td className="num" style={{ color: 'var(--fg)' }}>{zl(o.total)}</td><td><StatusPill s={o.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="empty"><b>Brak zamówień</b></div>}
      </div>
      {products === 0 && (
        <form action={loadDemoData} className="panel row" style={{ marginTop: 12 }}>
          <span className="spacer">Baza produktów jest pusta.</span>
          <button className="btn btn-primary">Wgraj produkty demonstracyjne</button>
        </form>
      )}
    </>
  );
}
