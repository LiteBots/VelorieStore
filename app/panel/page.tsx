import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Types } from 'mongoose';
import { db } from '@/lib/db';
import { License, Order, Ticket } from '@/models';
import { licOf, zl } from '@/lib/catalog';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/panel/Status';

export default async function PanelHome() {
  const user = await requireUser();
  await db();
  const [lics, orderCount, orders, spent, tickets] = await Promise.all([
    License.countDocuments({ userId: user.id, status: 'active' }),
    Order.countDocuments({ userId: user.id }),
    Order.find({ userId: user.id }).sort({ createdAt: -1 }).limit(5).lean<any[]>(),
    Order.aggregate([{ $match: { userId: new Types.ObjectId(user.id), status: 'paid' } }, { $group: { _id: null, t: { $sum: '$total' } } }]),
    Ticket.countDocuments({ userId: user.id, status: { $ne: 'closed' } }),
  ]);
  return (
    <>
      <div className="panel-top">
        <div><span className="eyebrow">Panel klienta</span><h1>Cześć, {user.name}</h1></div>
        <Link href="/sklep" className="btn btn-primary"><Icon name="cart" />Przejdź do sklepu</Link>
      </div>
      <div className="kpis">
        <div className="kpi"><span><Icon name="key" />Aktywne licencje</span><b>{lics}</b></div>
        <div className="kpi"><span><Icon name="receipt" />Zamówienia</span><b>{orderCount}</b></div>
        <div className="kpi"><span><Icon name="wallet" />Wydano łącznie</span><b>{zl(spent[0]?.t || 0)}</b></div>
        <div className="kpi"><span><Icon name="ticket" />Otwarte tickety</span><b>{tickets}</b></div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-h"><h3>Ostatnie zamówienia</h3><Link href="/panel/zamowienia" className="btn btn-sm btn-ghost">Wszystkie <Icon name="arrow" /></Link></div>
        {orders.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Zamówienie</th><th>Produkty</th><th>Data</th><th className="num">Kwota</th><th>Status</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={String(o._id)}>
                <td className="mono"><Link href={`/zamowienie/${o.number}`} style={{ color: 'var(--fg)' }}>{o.number}</Link></td>
                <td>{o.items.map((i: any) => `${i.name} (${licOf(i.license).name})`).join(', ')}</td>
                <td className="mono muted">{new Date(o.createdAt).toLocaleDateString('pl-PL')}</td>
                <td className="num">{zl(o.total)}</td>
                <td><StatusPill s={o.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="empty"><b>Nie masz jeszcze zamówień</b><Link href="/sklep" className="btn btn-ghost">Zobacz produkty</Link></div>}
      </div>
      <div className="check-list" style={{ marginTop: 12 }}>
        <div><Icon name="key" /><span><b>Klucze i pliki</b><small><Link href="/panel/zakupy" style={{ color: 'var(--cyan)' }}>Moje zakupy</Link> — kopiuj klucze, odpinaj serwery, pobieraj aktualizacje.</small></span></div>
        <div><Icon name="ticket" /><span><b>Pomoc techniczna</b><small><Link href="/panel/tickety" style={{ color: 'var(--cyan)' }}>Załóż ticket</Link> — widzimy Twoje licencje, więc pomożemy szybciej.</small></span></div>
        <div><Icon name="upload" /><span><b>Zostań twórcą</b><small><Link href="/sprzedawaj" style={{ color: 'var(--cyan)' }}>Sprzedawaj</Link> swoje pluginy i skrypty, 85% ceny dla Ciebie.</small></span></div>
      </div>
    </>
  );
}
