import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadProduct, loadProducts, loadSellers, safe } from '@/lib/products';
import { ProductView, type ReviewDTO } from '@/components/ProductView';
import { JsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/site';
import { PLATS, catOf, priceFor } from '@/lib/catalog';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Review } from '@/models';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) return { title: 'Nie znaleziono produktu' };
  const c = catOf(p.cat);
  const title = `${p.name} — ${c.full} (${p.compat})`;
  return {
    title,
    description: `${p.desc} Cena od ${p.price} zł, licencja z natychmiastową dostawą, ${p.rating.toFixed(1)}★ z ${p.reviews} opinii.`,
    keywords: [p.name, c.full, ...p.tech, p.type, PLATS[p.plat]],
    alternates: { canonical: `/produkt/${p.slug}` },
    openGraph: { type: 'website', title, description: p.desc, url: `${SITE.url}/produkt/${p.slug}` },
    twitter: { card: 'summary_large_image', title, description: p.desc },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) notFound();
  const [all, sellers, user] = await Promise.all([loadProducts(), loadSellers(), getUser().catch(() => null)]);
  const related = all
    .filter((x) => x.slug !== p.slug && (x.cat === p.cat || x.plat === p.plat))
    .sort((a, b) => Number(b.cat === p.cat) - Number(a.cat === p.cat) || b.sales - a.sales)
    .slice(0, 4);

  const { reviews, canReview } = await safe(async () => {
    await db();
    const list = await Review.find({ productSlug: p.slug, hidden: false }).sort({ createdAt: -1 }).limit(30).lean<any[]>();
    const owns = user ? await License.exists({ userId: user.id, productSlug: p.slug, status: 'active' }) : null;
    const reviewed = user ? await Review.exists({ userId: user.id, productSlug: p.slug }) : null;
    return {
      reviews: list.map<ReviewDTO>((r) => ({ id: String(r._id), user: r.username, rating: r.rating, text: r.text, date: new Date(r.createdAt).toLocaleDateString('pl-PL') })),
      canReview: !!owns && !reviewed,
    };
  }, { reviews: [] as ReviewDTO[], canReview: false });

  const seller = sellers[p.seller];
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.desc,
        sku: p.slug,
        category: catOf(p.cat).full,
        image: `${SITE.url}/produkt/${p.slug}/opengraph-image`,
        brand: { '@type': 'Brand', name: seller?.name || SITE.name },
        aggregateRating: p.reviews ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } : undefined,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'PLN',
          lowPrice: priceFor(p.price, 'std'),
          highPrice: priceFor(p.price, 'net'),
          offerCount: 3,
          availability: 'https://schema.org/InStock',
          url: `${SITE.url}/produkt/${p.slug}`,
        },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Start', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: catOf(p.cat).full, item: `${SITE.url}/kategoria/${p.cat}` },
          { '@type': 'ListItem', position: 3, name: p.name, item: `${SITE.url}/produkt/${p.slug}` },
        ],
      }} />
      <ProductView p={p} seller={seller} related={related} sellers={sellers} reviews={reviews} canReview={canReview} />
    </>
  );
}
