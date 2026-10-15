import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Ticket } from '@/models';
import { closeOwnTicket, replyTicket } from '@/lib/actions/panel';
import { ActionForm, Submit } from '@/components/Forms';
import { StatusPill } from '@/components/panel/Status';
import { Icon } from '@/components/Icon';

export default async function TicketView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser('/panel/tickety');
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  await db();
  const t = await Ticket.findOne({ _id: id, userId: user.id }).lean<any>();
  if (!t) notFound();
  return (
    <>
      <div className="panel-top">
        <div><Link href="/panel/tickety" className="crumbs"><Icon name="left" />Tickety</Link><h1>#{t.number} {t.subject}</h1></div>
        <div className="row"><StatusPill s={t.status} />
          {t.status !== 'closed' && <form action={closeOwnTicket}><input type="hidden" name="id" value={id} /><button className="btn btn-ghost btn-sm">Zamknij ticket</button></form>}
        </div>
      </div>
      <div className="stack">
        {t.messages.map((m: any, i: number) => (
          <div key={i} className={`msg ${m.staff ? 'staff' : ''}`}>
            <header><b>{m.author}</b>{m.staff && <span className="pill blue">Velorie</span>}<span>{new Date(m.at).toLocaleString('pl-PL')}</span></header>
            <p>{m.body}</p>
          </div>
        ))}
        {t.status !== 'closed' ? (
          <ActionForm action={replyTicket} className="panel stack">
            <input type="hidden" name="id" value={id} />
            <div className="field"><label htmlFor="r-msg">Odpowiedź</label><textarea id="r-msg" name="message" required minLength={2} maxLength={4000} /></div>
            <Submit style={{ width: 'fit-content' }}>Wyślij</Submit>
          </ActionForm>
        ) : <div className="alert info">Ticket jest zamknięty. Jeśli problem wrócił, utwórz nowy.</div>}
      </div>
    </>
  );
}
