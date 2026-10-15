import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Order } from '@/models';
import { licOf, zl } from '@/lib/catalog';
import { StatusPill } from '@/components/panel/Status';

export default async function Orders() {
  const user = await requireUser('/panel/zamowienia');
  await db();
  const orders = await Order.find({ userId: user.id }).sort({ createdAt: -1 }).limit(200).lean<any[]>();
  return (
    <>
      <div className="panel-top"><div><span className="eyebrow">Historia</span><h1>Zamówienia</h1></div></div>
      <div className="panel">
        {orders.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Zamówienie</th><th>Produkty</th><th>Data</th><th>Płatność</th><th className="num">Rabat</th><th className="num">Kwota</th><th>Status</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={String(o._id)}>
                <td className="mono"><Link href={`/zamowienie/${o.number}`} style={{ color: 'var(--fg)' }}>{o.number}</Link></td>
                <td style={{ whiteSpace: 'normal' }}>{o.items.map((i: any) => `${i.name} (${licOf(i.license).name})`).join(', ')}</td>
                <td className="mono muted">{new Date(o.createdAt).toLocaleString('pl-PL')}</td>
                <td>{o.provider === 'stripe' ? 'Stripe' : 'BLIK (test)'}</td>
                <td className="num">{o.discount ? '−' + zl(o.discount) : '—'}</td>
                <td className="num" style={{ color: 'var(--fg)' }}>{zl(o.total)}</td>
                <td><StatusPill s={o.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="empty"><b>Brak zamówień</b></div>}
      </div>
    </>
  );
}
