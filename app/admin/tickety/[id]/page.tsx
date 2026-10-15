import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { License, Order, Ticket } from '@/models';
import { adminReplyTicket, ticketStatus } from '@/lib/actions/admin';
import { ActionForm, Submit } from '@/components/Forms';
import { AdminTop } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';
import { licOf, zl } from '@/lib/catalog';

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  await db();
  const t = await Ticket.findById(id).lean<any>();
  if (!t) notFound();
  const [lics, orders] = await Promise.all([
    License.find({ userId: t.userId }).lean<any[]>(),
    Order.find({ userId: t.userId }).sort({ createdAt: -1 }).limit(5).lean<any[]>(),
  ]);
  return (
    <>
      <AdminTop eyebrow={`Ticket #${t.number} · ${t.category}`} title={t.subject}>
        <StatusPill s={t.status} />
        <form action={ticketStatus} className="inline-form">
          <input type="hidden" name="id" value={id} />
          <select name="status" defaultValue={t.status}><option value="open">Otwarty</option><option value="answered">Odpowiedziano</option><option value="closed">Zamknięty</option></select>
          <button className="btn btn-sm btn-ghost">Zmień</button>
        </form>
      </AdminTop>
      <div className="d-grid" style={{ marginTop: 0 }}>
        <div className="stack">
          {t.messages.map((m: any, i: number) => (
            <div key={i} className={`msg ${m.staff ? 'staff' : ''}`}>
              <header><b>{m.author}</b>{m.staff && <span className="pill blue">zespół</span>}<span>{new Date(m.at).toLocaleString('pl-PL')}</span></header>
              <p>{m.body}</p>
            </div>
          ))}
          <ActionForm action={adminReplyTicket} className="panel stack">
            <input type="hidden" name="id" value={id} />
            <div className="field"><label htmlFor="ar">Odpowiedź</label><textarea id="ar" name="message" required /></div>
            <Submit style={{ width: 'fit-content' }}>Odpowiedz</Submit>
          </ActionForm>
        </div>
        <div className="panel stack">
          <h3 style={{ fontSize: 16 }}>Klient</h3>
          <dl className="kv"><dt>Nick</dt><dd>{t.username}</dd><dt>Discord</dt><dd>{t.discordId}</dd></dl>
          <h3 style={{ fontSize: 15, marginTop: 8 }}>Licencje ({lics.length})</h3>
          {lics.map((l) => <div key={String(l._id)} className="mono" style={{ fontSize: 12 }}>{l.productSlug} · {licOf(l.tier).name} · …{l.keyLast4} · {l.status}</div>)}
          <h3 style={{ fontSize: 15, marginTop: 8 }}>Zamówienia</h3>
          {orders.map((o) => <div key={String(o._id)} className="mono" style={{ fontSize: 12 }}>{o.number} · {zl(o.total)} · {o.status}</div>)}
          <Link href={`/admin/licencje?q=${t.discordId}`} className="btn btn-sm btn-ghost" style={{ width: 'fit-content' }}>Zarządzaj licencjami</Link>
        </div>
      </div>
    </>
  );
}
