import { loadProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

/** Lekka lista produktów dla wyszukiwarki (Ctrl K). */
export async function GET() {
  const list = await loadProducts();
  return Response.json(
    list.map((p) => ({ slug: p.slug, name: p.name, price: p.price, cat: p.cat, plat: p.plat, art: p.art, imageUrl: p.imageUrl, desc: p.desc, tech: p.tech })),
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
  );
}
