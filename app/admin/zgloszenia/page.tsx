import { db } from '@/lib/db';
import { Application } from '@/models';
import { applicationAction } from '@/lib/actions/admin';
import { AdminTop } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';

export default async function AdminApplications() {
  await db();
  const list = await Application.find().sort({ status: 1, createdAt: -1 }).limit(100).lean<any[]>();
  return (
    <>
      <AdminTop title="Zgłoszenia twórców" />
      <div className="stack">
        {list.map((a) => (
          <div key={String(a._id)} className="panel stack">
            <div className="row">
              <b style={{ fontSize: 16 }}>{a.studio}</b><span className="pill">{a.plat}</span><StatusPill s={a.status} />
              <span className="spacer" />
              <span className="mono muted" style={{ fontSize: 12 }}>{a.username} · {a.discordId} · {new Date(a.createdAt).toLocaleString('pl-PL')}</span>
            </div>
            <a href={a.portfolio} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--cyan)', fontSize: 13.5 }}>{a.portfolio}</a>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--fg-2)', fontSize: 14 }}>{a.about}</p>
            {a.status === 'pending' ? (
              <form action={applicationAction} className="inline-form" style={{ flexWrap: 'wrap' }}>
                <input type="hidden" name="id" value={String(a._id)} />
                <input name="note" placeholder="Notatka (opcjonalnie)" maxLength={300} style={{ minWidth: 240 }} />
                <button name="action" value="approve" className="btn btn-sm btn-primary">Akceptuj i utwórz sklep</button>
                <button name="action" value="reject" className="btn btn-sm btn-danger">Odrzuć</button>
              </form>
            ) : a.note ? <span className="muted" style={{ fontSize: 13 }}>Notatka: {a.note}</span> : null}
          </div>
        ))}
        {!list.length && <div className="empty"><b>Brak zgłoszeń</b></div>}
      </div>
    </>
  );
}
