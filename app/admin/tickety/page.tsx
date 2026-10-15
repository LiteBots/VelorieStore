import Link from 'next/link';
import { db } from '@/lib/db';
import { Ticket } from '@/models';
import { AdminTop } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';

export default async function AdminTickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  await db();
  const filter = status && ['open', 'answered', 'closed'].includes(status) ? { status } : { status: { $ne: 'closed' } };
  const list = await Ticket.find(filter).sort({ updatedAt: -1 }).limit(100).lean<any[]>();
  return (
    <>
      <AdminTop title="Tickety">
        <div className="seg">
          {[['', 'Aktywne'], ['open', 'Otwarte'], ['answered', 'Odpowiedziane'], ['closed', 'Zamknięte']].map(([v, l]) => (
            <Link key={v} href={`/admin/tickety${v ? `?status=${v}` : ''}`} className={(status || '') === v ? 'on' : ''}>{l}</Link>
          ))}
        </div>
      </AdminTop>
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>#</th><th>Temat</th><th>Klient</th><th>Kategoria</th><th>Wiadomości</th><th>Aktualizacja</th><th>Status</th></tr></thead>
        <tbody>{list.map((t) => (
          <tr key={String(t._id)}>
            <td className="mono">#{t.number}</td>
            <td><Link href={`/admin/tickety/${t._id}`} style={{ color: 'var(--fg)', fontWeight: 700 }}>{t.subject}</Link></td>
            <td>{t.username}</td><td>{t.category}</td><td className="num">{t.messages.length}</td>
            <td className="mono muted">{new Date(t.updatedAt).toLocaleString('pl-PL')}</td><td><StatusPill s={t.status} /></td>
          </tr>
        ))}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak ticketów</b></div>}</div>
    </>
  );
}
