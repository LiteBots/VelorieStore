import Link from 'next/link';
import { db } from '@/lib/db';
import { Product } from '@/models';
import { catOf, num, zl } from '@/lib/catalog';
import { toggleProduct } from '@/lib/actions/admin';
import { AdminTop, SearchBar, escRe } from '@/components/admin/ui';
import { ProductArt } from '@/components/ProductArt';
import { Icon } from '@/components/Icon';

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const { q, saved } = await searchParams;
  await db();
  const filter = q ? { $or: [{ name: { $regex: escRe(q), $options: 'i' } }, { slug: { $regex: escRe(q), $options: 'i' } }] } : {};
  const list = await Product.find(filter).sort({ updatedAt: -1 }).limit(200).lean<any[]>();
  return (
    <>
      <AdminTop title="Produkty"><Link href="/admin/produkty/nowy" className="btn btn-primary"><Icon name="plus" />Nowy produkt</Link></AdminTop>
      {saved && <div className="alert ok" style={{ marginBottom: 12 }}>Zapisano produkt.</div>}
      <SearchBar q={q} placeholder="Nazwa lub slug…" />
      <div className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Produkt</th><th>Kategoria</th><th>Twórca</th><th>Wersja</th><th className="num">Cena</th><th className="num">Sprzedaż</th><th className="num">Ocena</th><th>Status</th><th /></tr></thead>
        <tbody>{list.map((p) => (
          <tr key={String(p._id)}>
            <td><div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="tbl-thumb"><ProductArt p={{ id: p.slug, art: p.art, plat: catOf(p.cat).plat, imageUrl: p.imageUrl }} w={200} h={125} /></span>
              <Link href={`/admin/produkty/${p._id}`} style={{ color: 'var(--fg)', fontWeight: 700 }}>{p.name}</Link>
            </div></td>
            <td>{catOf(p.cat).full}</td><td>{p.seller}</td><td className="mono">v{p.version}</td>
            <td className="num">{zl(p.price)}</td><td className="num">{num(p.sales)}</td><td className="num">{p.rating}</td>
            <td>{p.published ? <span className="status ok">opublikowany</span> : <span className="status warn">ukryty</span>}</td>
            <td><div className="row" style={{ flexWrap: 'nowrap' }}>
              <Link className="btn btn-sm btn-ghost" href={`/admin/produkty/${p._id}`}>Edytuj</Link>
              <form action={toggleProduct}><input type="hidden" name="id" value={String(p._id)} /><button className="btn btn-sm btn-ghost">{p.published ? 'Ukryj' : 'Publikuj'}</button></form>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>{!list.length && <div className="empty"><b>Brak produktów</b></div>}</div>
    </>
  );
}
