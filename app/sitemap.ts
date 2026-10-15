import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { CATS } from '@/lib/catalog';
import { loadProducts, loadSellers } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, sellers] = await Promise.all([loadProducts(), loadSellers()]);
  const now = new Date();
  const page = (path: string, priority: number, freq: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly') => ({
    url: `${SITE.url}${path}`, lastModified: now, changeFrequency: freq, priority,
  });
  return [
    page('/', 1, 'daily'),
    page('/sklep', 0.9, 'daily'),
    ...CATS.map((c) => page(`/kategoria/${c.id}`, 0.8, 'daily')),
    ...products.map((p) => ({ url: `${SITE.url}/produkt/${p.slug}`, lastModified: p.updated ? new Date(p.updated) : now, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...Object.keys(sellers).map((s) => page(`/tworca/${s}`, 0.5)),
    page('/sprzedawaj', 0.7, 'monthly'),
    page('/licencje', 0.6, 'monthly'),
    page('/faq', 0.6, 'monthly'),
    page('/kontakt', 0.5, 'monthly'),
    page('/o-nas', 0.4, 'monthly'),
    page('/regulamin', 0.3, 'yearly'),
    page('/polityka-prywatnosci', 0.3, 'yearly'),
    page('/polityka-cookies', 0.3, 'yearly'),
    page('/zwroty', 0.3, 'yearly'),
  ];
}
