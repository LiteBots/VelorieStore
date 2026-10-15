import { db } from '@/lib/db';
import { Contact } from '@/models';
import { messageAction } from '@/lib/actions/admin';
import { AdminTop, Act } from '@/components/admin/ui';

export default async function AdminMessages() {
  await db();
  const list = await Contact.find().sort({ read: 1, createdAt: -1 }).limit(100).lean<any[]>();
  return (
    <>
      <AdminTop title="Wiadomości z formularza" />
      <div className="stack">
        {list.map((m) => {
          const id = String(m._id);
          return (
            <div key={id} className={`msg ${m.read ? '' : 'staff'}`}>
              <header>
                <b>{m.name}</b><a href={`mailto:${m.email}`} style={{ color: 'var(--cyan)' }}>{m.email}</a><span className="pill">{m.topic}</span>
                <span>{new Date(m.createdAt).toLocaleString('pl-PL')}</span><span className="spacer" />
                {!m.read && <Act action={messageAction} id={id} value="read" label="Przeczytane" />}
                <Act action={messageAction} id={id} value="delete" label="Usuń" danger />
              </header>
              <p>{m.message}</p>
            </div>
          );
        })}
        {!list.length && <div className="empty"><b>Brak wiadomości</b></div>}
      </div>
    </>
  );
}
