import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadProducts, loadSellers } from '@/lib/products';
import { ProductCard, SellerAv } from '@/components/ProductCard';
import { ProductArt } from '@/components/ProductArt';
import { Icon } from '@/components/Icon';
import { JsonLd } from '@/components/JsonLd';
import { num } from '@/lib/catalog';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = (await loadSellers())[slug];
  if (!s) return { title: 'Twórca nie istnieje' };
  return { title: `${s.name} — sklep twórcy`, description: s.bio, alternates: { canonical: `/tworca/${slug}` } };
}

export default async function SellerPage({ params }: Props) {
  const { slug } = await params;
  const [sellers, products] = await Promise.all([loadSellers(), loadProducts()]);
  const s = sellers[slug];
  if (!s) notFound();
  const items = products.filter((p) => p.seller === slug);
  const top = items[0] || products[0];
  return (
    <div className="view wrap">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: s.name, description: s.bio, url: `${SITE.url}/tworca/${slug}` }} />
      <div className="sp-banner">{top && <ProductArt p={top} v={1} w={1400} h={440} />}</div>
      <div className="sp-head">
        <SellerAv s={s} />
        <div style={{ paddingBottom: 6, minWidth: 0, flex: 1 }}>
          <h1>{s.name}{s.official && <Icon name="ver" />}</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '64ch' }}>{s.bio}</p>
        </div>
        <a href={SITE.discordInvite} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ marginBottom: 6 }}><Icon name="discord" />Discord</a>
      </div>
      <div className="sp-stats">
        <div><b>{num(s.sales)}</b><span>sprzedaży</span></div>
        <div><b>{items.length}</b><span>produktów</span></div>
        <div><b>{String(s.rating).replace('.', ',')} ★</b><span>średnia ocena</span></div>
        <div><b>od {s.since}</b><span>na Velorie</span></div>
      </div>
      <div className="sec-head" style={{ marginTop: 48 }}><div><span className="eyebrow">Produkty</span><h2 style={{ fontSize: 'clamp(26px,3vw,36px)' }}>Sklep twórcy</h2></div></div>
      <div className="grid">
        {items.length ? items.map((p) => <ProductCard key={p.slug} p={p} seller={s} />) : <div className="empty"><b>Twórca nie ma jeszcze opublikowanych produktów</b></div>}
      </div>
    </div>
  );
}
