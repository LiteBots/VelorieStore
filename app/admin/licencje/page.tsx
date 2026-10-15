import { db } from '@/lib/db';
import { License, User } from '@/models';
import { hashKey, LICENSE_RE, normalizeKey } from '@/lib/crypto';
import { licOf } from '@/lib/catalog';
import { licenseAction } from '@/lib/actions/admin';
import { AdminTop, Act, Pager, PER_PAGE, SearchBar, escRe, pageOf } from '@/components/admin/ui';
import { StatusPill } from '@/components/panel/Status';

export default async function AdminLicenses({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  await db();
  let filter: any = {};
  const q = (sp.q || '').trim();
  if (q) {
    if (LICENSE_RE.test(normalizeKey(q))) filter = { keyHash: hashKey(q) }; // wyszukiwanie po pełnym kluczu (przez hash)
    else if (/^\d{15,22}$/.test(q)) filter = { discordId: q };
    else {
      const users = await User.find({ username: { $regex: escRe(q), $options: 'i' } }).select('_id').limit(50).lean<any[]>();
      filter = { $or: [{ productSlug: { $regex: escRe(q), $options: 'i' } }, { keyLast4: q.toUpperCase().slice(-4) }, { userId: { $in: users.map((u) => u._id) } }] };
    }
  }
  const [list, total] = await Promise.all([
    License.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).populate('userId', 'username discordId').lean<any[]>(),
    License.countDocuments(filter),
  ]);
  return (
    <>
      <AdminTop title="Licencje" />
      <SearchBar q={sp.q} placeholder="Pełny klucz VLR-…, ostatnie 4 znaki, produkt, nick lub Discord ID" />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Klucz</th><th>Produkt</th><th>Właściciel</th><th>Typ</th><th>Serwery</th><th>Ostatnia weryfikacja</th><th>Status</th><th>Akcje</th></tr></thead>
        <tbody>{list.map((l) => {
          const id = String(l._id);
          return (
            <tr key={id}>
              <td className="mono">VLR-••••-••••-{l.keyLast4}</td>
              <td>{l.productSlug}</td>
              <td>{l.userId?.username || '—'}<div className="mono muted" style={{ fontSize: 11 }}>{l.discordId}</div></td>
              <td>{licOf(l.tier).name}</td>
              <td className="mono" title={l.servers.map((s: any) => s.label).join(', ')}>{l.servers.length}/{l.maxServers >= 999 ? '∞' : l.maxServers}</td>
              <td className="mono muted">{l.lastCheckAt ? new Date(l.lastCheckAt).toLocaleString('pl-PL') : '—'} <span style={{ fontSize: 11 }}>({l.checks || 0})</span></td>
              <td><StatusPill s={l.status} /></td>
              <td><div className="row" style={{ flexWrap: 'nowrap' }}>
                <Act action={licenseAction} id={id} value="reset" label="Odepnij serwery" />
                {l.status === 'active' ? <Act action={licenseAction} id={id} value="revoke" label="Unieważnij" danger /> : <Act action={licenseAction} id={id} value="restore" label="Przywróć" />}
              </div></td>
            </tr>
          );
        })}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak licencji</b></div>}</div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Pełne klucze są przechowywane tylko jako hash i szyfrogram — wyszukasz licencję po całym kluczu, ale panel nie wyświetla go w całości.</p>
      <Pager page={page} pages={Math.ceil(total / PER_PAGE)} base={`/admin/licencje?q=${encodeURIComponent(sp.q || '')}`} />
    </>
  );
}
