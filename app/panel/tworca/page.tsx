import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Order, Product, Seller } from '@/models';
import { catOf, licOf, num, SELLER_SHARE, zl } from '@/lib/catalog';
import { dailyRevenue } from '@/lib/analytics';
import { RevenueChart } from '@/components/admin/Chart';
import { ProductArt } from '@/components/ProductArt';
import { StatusPill } from '@/components/panel/Status';
import { Icon } from '@/components/Icon';

export default async function CreatorPanel() {
  const user = await requireUser('/panel/tworca');
  if (!user.sellerSlug) {
    return (
      <div className="empty" style={{ marginTop: 20 }}>
        <span className="ico"><Icon name="upload" /></span>
        <b>Nie masz jeszcze konta twórcy</b>
        <span>Wyślij zgłoszenie z portfolio — po akceptacji zobaczysz tu sprzedaż, licencje i wypłaty.</span>
        <Link href="/sprzedawaj#zgloszenie" className="btn btn-primary">Zostań twórcą</Link>
      </div>
    );
  }
  await db();
  const slug = user.sellerSlug;
  const seller = await Seller.findOne({ slug }).lean<any>();
  const products = await Product.find({ seller: slug }).sort({ sales: -1 }).lean<any[]>();
  const slugs = products.map((p) => p.slug);
  const [daily, activeLics, orders] = await Promise.all([
    dailyRevenue(30, slug, SELLER_SHARE),
    License.countDocuments({ productSlug: { $in: slugs }, status: 'active' }),
    Order.find({ 'items.seller': slug, status: { $in: ['paid', 'refunded'] } }).sort({ createdAt: -1 }).limit(12).lean<any[]>(),
  ]);
  const earned30 = daily.reduce((a, d) => a + d.value, 0);
  const sold30 = daily.reduce((a, d) => a + d.count, 0);
  const totalSales = products.reduce((a, p) => a + (p.sales || 0), 0) || 1;
  return (
    <>
      <div className="panel-top">
        <div><span className="eyebrow">Panel twórcy · {seller?.name || slug}</span><h1>Przegląd sprzedaży</h1></div>
        <Link href={`/tworca/${slug}`} className="btn btn-ghost"><Icon name="external" />Mój sklep</Link>
      </div>
      <div className="kpis">
        <div className="kpi"><span><Icon name="wallet" />Twój udział · 30 dni</span><b>{zl(earned30)}</b><span className="delta" style={{ color: 'var(--muted)' }}>85% ceny sprzedaży</span></div>
        <div className="kpi"><span><Icon name="cart" />Sprzedane licencje · 30 dni</span><b>{sold30}</b></div>
        <div className="kpi"><span><Icon name="key" />Aktywne licencje</span><b>{num(activeLics)}</b></div>
        <div className="kpi"><span><Icon name="box" />Produkty</span><b>{products.length}</b></div>
      </div>
      <div className="d-grid">
        <div className="panel"><div className="panel-h"><h3>Twój przychód dzienny</h3><span className="muted mono" style={{ fontSize: 11.5 }}>30 dni</span></div><RevenueChart data={daily} /></div>
        <div className="panel">
          <div className="panel-h"><h3>Najlepsze produkty</h3><span className="muted mono" style={{ fontSize: 11.5 }}>udział w sprzedaży</span></div>
          {products.slice(0, 5).map((p) => {
            const share = Math.round(((p.sales || 0) / totalSales) * 100);
            return (
              <div className="tp-row" key={p.slug}>
                <ProductArt p={{ id: p.slug, art: p.art, plat: catOf(p.cat).plat, imageUrl: p.imageUrl }} w={200} h={125} />
                <div style={{ minWidth: 0 }}><b>{p.name}</b><small>{num(p.sales)} szt. · {p.rating}★</small><div className="meter"><i style={{ width: `${share}%` }} /></div></div>
                <span className="mono" style={{ fontSize: 12.5 }}>{share}%</span>
              </div>
            );
          })}
          {!products.length && <p className="muted">Brak produktów. Administrator doda je po weryfikacji.</p>}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="panel-h"><h3>Ostatnie zamówienia z Twoimi produktami</h3></div>
        {orders.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Zamówienie</th><th>Produkt</th><th>Licencja</th><th>Data</th><th className="num">Kwota</th><th className="num">Twój udział</th><th>Status</th></tr></thead>
            <tbody>{orders.flatMap((o) => o.items.filter((i: any) => i.seller === slug).map((i: any) => (
              <tr key={o.number + i.productSlug}>
                <td className="mono">{o.number}</td><td style={{ color: 'var(--fg)' }}>{i.name}</td><td>{licOf(i.license).name}</td>
                <td className="mono muted">{new Date(o.createdAt).toLocaleString('pl-PL')}</td>
                <td className="num">{zl(i.price)}</td>
                <td className="num" style={{ color: 'var(--fg)' }}>{o.status === 'refunded' ? '—' : zl(Math.round(i.price * SELLER_SHARE * 100) / 100)}</td>
                <td><StatusPill s={o.status} /></td>
              </tr>
            )))}</tbody>
          </table></div>
        ) : <div className="empty"><b>Brak zamówień</b></div>}
      </div>
      <div className="alert info" style={{ marginTop: 12 }}>Nowe produkty i aktualizacje plików wysyłasz przez ticket — administrator publikuje je po skanie bezpieczeństwa.</div>
    </>
  );
}
