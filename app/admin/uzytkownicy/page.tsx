import { db } from '@/lib/db';
import { Seller, User } from '@/models';
import { userAction } from '@/lib/actions/admin';
import { AdminTop, Pager, PER_PAGE, SearchBar, escRe, pageOf } from '@/components/admin/ui';
import { avatarUrl } from '@/lib/discord';

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  await db();
  const filter: any = sp.q ? { $or: [{ username: { $regex: escRe(sp.q), $options: 'i' } }, { globalName: { $regex: escRe(sp.q), $options: 'i' } }, { discordId: sp.q.slice(0, 30) }, { email: sp.q.toLowerCase().slice(0, 120) }] } : {};
  const [list, total, sellers] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean<any[]>(),
    User.countDocuments(filter),
    Seller.find().select('slug name').lean<any[]>(),
  ]);
  return (
    <>
      <AdminTop title="Użytkownicy" />
      <SearchBar q={sp.q} placeholder="Nick, Discord ID lub e-mail…" />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Użytkownik</th><th>E-mail</th><th>Rejestracja</th><th>Ostatnie logowanie</th><th>Rola</th><th>Status</th><th>Akcje</th></tr></thead>
        <tbody>{list.map((u) => {
          const id = String(u._id);
          const img = avatarUrl(u.discordId, u.avatar);
          return (
            <tr key={id}>
              <td><div className="row" style={{ flexWrap: 'nowrap' }}>
                {img ? <img src={img} alt="" width={28} height={28} style={{ borderRadius: 8 }} /> : <span className="av" style={{ background: '#26375c', width: 28, height: 28 }}>{u.username[0]}</span>}
                <div><b style={{ color: 'var(--fg)' }}>{u.globalName || u.username}</b><div className="mono muted" style={{ fontSize: 11 }}>{u.discordId}</div></div>
              </div></td>
              <td className="mono" style={{ fontSize: 12 }}>{u.email || '—'}</td>
              <td className="mono muted">{new Date(u.createdAt).toLocaleDateString('pl-PL')}</td>
              <td className="mono muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pl-PL') : '—'}</td>
              <td>
                <form action={userAction} className="inline-form">
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="role" />
                  <select name="role" defaultValue={u.role}><option value="user">Klient</option><option value="creator">Twórca</option><option value="admin">Admin</option></select>
                  <select name="seller" defaultValue={u.sellerSlug || ''}><option value="">— sklep —</option>{sellers.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
                  <button className="btn btn-sm btn-ghost">Zapisz</button>
                </form>
              </td>
              <td>{u.banned ? <span className="status bad" title={u.banReason}>zablokowany</span> : u.deletionRequestedAt ? <span className="status warn">wniosek o usunięcie</span> : <span className="status ok">aktywny</span>}</td>
              <td>
                {u.banned ? (
                  <form action={userAction} className="inline-form"><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="unban" /><button className="btn btn-sm btn-ghost">Odblokuj</button></form>
                ) : (
                  <form action={userAction} className="inline-form"><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="ban" /><input name="reason" placeholder="powód" maxLength={200} style={{ width: 110 }} /><button className="btn btn-sm btn-danger">Zablokuj</button></form>
                )}
              </td>
            </tr>
          );
        })}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak użytkowników</b></div>}</div>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} base={`/admin/uzytkownicy?q=${encodeURIComponent(sp.q || '')}`} />
    </>
  );
}
