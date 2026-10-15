import { db } from '@/lib/db';
import { Order } from '@/models';
import { licOf, zl } from '@/lib/catalog';
import { orderAction } from '@/lib/actions/admin';
import { AdminTop, Act, Pager, PER_PAGE, SearchBar, escRe, pageOf } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';

const STATUSES = ['', 'pending', 'paid', 'refunded', 'cancelled', 'failed'];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  await db();
  const filter: any = {};
  if (sp.status && STATUSES.includes(sp.status)) filter.status = sp.status;
  if (sp.q) filter.$or = [{ number: { $regex: escRe(sp.q), $options: 'i' } }, { username: { $regex: escRe(sp.q), $options: 'i' } }, { discordId: sp.q.slice(0, 30) }];
  const [list, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean<any[]>(),
    Order.countDocuments(filter),
  ]);
  const base = `/admin/zamowienia?q=${encodeURIComponent(sp.q || '')}&status=${sp.status || ''}`;
  return (
    <>
      <AdminTop title="Zamówienia" />
      <SearchBar q={sp.q} placeholder="Numer, nick lub Discord ID…" extra={
        <select name="status" className="sel" defaultValue={sp.status || ''}>
          <option value="">Wszystkie statusy</option><option value="pending">Oczekujące</option><option value="paid">Opłacone</option><option value="refunded">Zwrócone</option><option value="cancelled">Anulowane</option><option value="failed">Nieudane</option>
        </select>
      } />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Zamówienie</th><th>Klient</th><th>Produkty</th><th>Data</th><th>Płatność</th><th className="num">Kwota</th><th>Status</th><th>Akcje</th></tr></thead>
        <tbody>{list.map((o) => (
          <tr key={String(o._id)}>
            <td className="mono">{o.number}</td>
            <td>{o.username}<div className="mono muted" style={{ fontSize: 11 }}>{o.discordId}</div></td>
            <td style={{ whiteSpace: 'normal', minWidth: 220 }}>{o.items.map((i: any) => `${i.name} (${licOf(i.license).name}) ${zl(i.price)}`).join(', ')}{o.coupon ? ` · kod ${o.coupon}` : ''}</td>
            <td className="mono muted">{new Date(o.createdAt).toLocaleString('pl-PL')}</td>
            <td>{o.provider}{o.providerRef ? <div className="mono muted" style={{ fontSize: 11 }}>{String(o.providerRef).slice(0, 18)}…</div> : null}</td>
            <td className="num" style={{ color: 'var(--fg)' }}>{zl(o.total)}</td>
            <td><StatusPill s={o.status} /></td>
            <td><div className="row" style={{ flexWrap: 'nowrap' }}>
              {o.status === 'pending' && <Act action={orderAction} id={String(o._id)} value="paid" label="Oznacz jako opłacone" />}
              {o.status === 'pending' && <Act action={orderAction} id={String(o._id)} value="cancel" label="Anuluj" />}
              {o.status === 'paid' && <Act action={orderAction} id={String(o._id)} value="refund" label="Zwrot + unieważnij" danger />}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak zamówień</b></div>}</div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>„Zwrot” unieważnia licencje w systemie. Pieniądze zwracasz w panelu Stripe.</p>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} base={base} />
    </>
  );
}
