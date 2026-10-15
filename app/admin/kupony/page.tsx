import { db } from '@/lib/db';
import { Coupon } from '@/models';
import { couponAction, createCoupon } from '@/lib/actions/admin';
import { ActionForm, Submit } from '@/components/Forms';
import { AdminTop, Act } from '@/components/admin/ui';

export default async function AdminCoupons() {
  await db();
  const list = await Coupon.find().sort({ createdAt: -1 }).lean<any[]>();
  return (
    <>
      <AdminTop title="Kody rabatowe" />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Kod</th><th>Rabat</th><th>Zakres</th><th className="num">Użycia</th><th>Ważny do</th><th>Status</th><th>Akcje</th></tr></thead>
        <tbody>{list.map((c) => {
          const id = String(c._id);
          const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
          return (
            <tr key={id}>
              <td className="mono" style={{ color: 'var(--fg)' }}>{c.code}</td><td>{c.pct}%</td>
              <td>{c.plat ? { minecraft: 'Minecraft', fivem: 'FiveM', other: 'Discord i web' }[c.plat as string] : 'wszystkie'}</td>
              <td className="num">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
              <td className="mono">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pl-PL') : 'bez limitu'}</td>
              <td>{!c.active ? <span className="status bad">wyłączony</span> : expired ? <span className="status warn">wygasł</span> : <span className="status ok">aktywny</span>}</td>
              <td><div className="row" style={{ flexWrap: 'nowrap' }}>
                <Act action={couponAction} id={id} value="toggle" label={c.active ? 'Wyłącz' : 'Włącz'} />
                <Act action={couponAction} id={id} value="delete" label="Usuń" danger />
              </div></td>
            </tr>
          );
        })}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak kodów</b><span>Dodaj np. JESIEN20 (20%, FiveM) z ogłoszenia na górze strony.</span></div>}</div>
      <ActionForm action={createCoupon} className="panel form" style={{ marginTop: 12, gridTemplateColumns: 'repeat(5, minmax(0,1fr)) auto', alignItems: 'end' }}>
        <div className="field"><label>Kod</label><input name="code" required maxLength={24} placeholder="BLACKWEEK" style={{ textTransform: 'uppercase' }} /></div>
        <div className="field"><label>Rabat %</label><input name="pct" type="number" min={1} max={90} defaultValue={20} /></div>
        <div className="field"><label>Platforma</label><select name="plat" defaultValue=""><option value="">Wszystkie</option><option value="minecraft">Minecraft</option><option value="fivem">FiveM</option><option value="other">Discord i web</option></select></div>
        <div className="field"><label>Limit użyć</label><input name="maxUses" type="number" min={0} defaultValue={0} /></div>
        <div className="field"><label>Ważny do</label><input name="expiresAt" type="date" /></div>
        <Submit style={{ height: 46 }}>Utwórz</Submit>
      </ActionForm>
    </>
  );
}
