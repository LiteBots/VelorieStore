import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Ticket } from '@/models';
import { createTicket } from '@/lib/actions/panel';
import { ActionForm, Submit } from '@/components/Forms';
import { StatusPill } from '@/components/panel/Status';

export default async function Tickets({ searchParams }: { searchParams: Promise<{ produkt?: string }> }) {
  const { produkt } = await searchParams;
  const user = await requireUser('/panel/tickety');
  await db();
  const list = await Ticket.find({ userId: user.id }).sort({ updatedAt: -1 }).limit(50).lean<any[]>();
  const pre = produkt && /^[a-z0-9-]+$/i.test(produkt) ? `Problem z produktem: ${produkt}` : '';
  return (
    <>
      <div className="panel-top"><div><span className="eyebrow">Pomoc</span><h1>Tickety</h1></div></div>
      <div className="d-grid" style={{ marginTop: 0 }}>
        <div className="panel">
          <div className="panel-h"><h3>Twoje zgłoszenia</h3></div>
          {list.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>#</th><th>Temat</th><th>Kategoria</th><th>Aktualizacja</th><th>Status</th></tr></thead>
              <tbody>{list.map((t) => (
                <tr key={String(t._id)}>
                  <td className="mono">#{t.number}</td>
                  <td><Link href={`/panel/tickety/${t._id}`} style={{ color: 'var(--fg)', fontWeight: 700 }}>{t.subject}</Link></td>
                  <td>{t.category}</td>
                  <td className="mono muted">{new Date(t.updatedAt).toLocaleString('pl-PL')}</td>
                  <td><StatusPill s={t.status} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className="empty"><b>Brak ticketów</b><span>Masz problem? Opisz go w formularzu obok.</span></div>}
        </div>
        <ActionForm action={createTicket} className="panel stack">
          <h3 style={{ fontSize: 16 }}>Nowy ticket</h3>
          <div className="field"><label htmlFor="t-sub">Temat</label><input id="t-sub" name="subject" required minLength={4} maxLength={100} defaultValue={pre} /></div>
          <div className="field">
            <label htmlFor="t-cat">Kategoria</label>
            <select id="t-cat" name="category" defaultValue={pre ? 'techniczne' : 'zakup'}>
              <option value="zakup">Zakup i płatność</option><option value="licencja">Licencja</option><option value="techniczne">Problem techniczny</option><option value="zwrot">Zwrot</option><option value="inne">Inne</option>
            </select>
          </div>
          <div className="field"><label htmlFor="t-msg">Opis</label><textarea id="t-msg" name="message" required minLength={10} maxLength={4000} placeholder="Wersja serwera, framework, logi z konsoli…" /></div>
          <Submit>Utwórz ticket</Submit>
        </ActionForm>
      </div>
    </>
  );
}
