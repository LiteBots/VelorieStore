import { db } from '@/lib/db';
import { Review } from '@/models';
import { reviewVisibility } from '@/lib/actions/admin';
import { AdminTop } from '@/components/admin/ui';

export default async function AdminReviews() {
  await db();
  const list = await Review.find().sort({ createdAt: -1 }).limit(100).lean<any[]>();
  return (
    <>
      <AdminTop title="Opinie" />
      <div className="stack">
        {list.map((r) => (
          <div key={String(r._id)} className="rv" style={r.hidden ? { opacity: 0.5 } : undefined}>
            <div className="rv-h">
              <div><b>{r.username}</b><span className="muted">{r.productSlug} · {new Date(r.createdAt).toLocaleString('pl-PL')}</span></div>
              <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <form action={reviewVisibility}><input type="hidden" name="id" value={String(r._id)} /><button className="btn btn-sm btn-ghost">{r.hidden ? 'Pokaż' : 'Ukryj'}</button></form>
            </div>
            <p>{r.text}</p>
          </div>
        ))}
        {!list.length && <div className="empty"><b>Brak opinii</b></div>}
      </div>
    </>
  );
}
