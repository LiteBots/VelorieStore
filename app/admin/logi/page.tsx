import { db } from '@/lib/db';
import { Audit } from '@/models';
import { AdminTop, Pager, pageOf } from '@/components/admin/ui';

export default async function AdminLogs({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const per = 50;
  await db();
  const [list, total] = await Promise.all([Audit.find().sort({ createdAt: -1 }).skip((page - 1) * per).limit(per).lean<any[]>(), Audit.countDocuments()]);
  return (
    <>
      <AdminTop title="Dziennik zdarzeń" />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Czas</th><th>Kto</th><th>Akcja</th><th>Cel</th></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={String(a._id)}>
            <td className="mono muted">{new Date(a.createdAt).toLocaleString('pl-PL')}</td>
            <td>{a.actor || '—'}<div className="mono muted" style={{ fontSize: 11 }}>{a.actorId}</div></td>
            <td className="mono" style={{ color: 'var(--fg)' }}>{a.action}</td>
            <td className="mono" style={{ fontSize: 12 }}>{a.target || '—'}</td>
          </tr>
        ))}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak wpisów</b></div>}</div>
      <Pager page={page} pages={Math.ceil(total / per)} base="/admin/logi" />
    </>
  );
}
