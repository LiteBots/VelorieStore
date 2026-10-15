import 'server-only';
import { cache } from 'react';
import { db } from './db';
import { Product, Seller } from '@/models';
import { catOf } from './catalog';
import { SEED_PRODUCTS, SEED_SELLERS } from './seed-data';
import type { ProductDTO, SellerDTO } from './types';

let seeded = false;

/** Przy pierwszym starcie z pustą bazą wgrywa produkty i twórców z wersji demo. */
export async function ensureSeed() {
  if (seeded) return;
  await db();
  if ((await Product.estimatedDocumentCount()) > 0) {
    seeded = true;
    return;
  }
  for (const [slug, s] of Object.entries(SEED_SELLERS)) {
    await Seller.updateOne(
      { slug },
      { $setOnInsert: { slug, name: s.name, color: s.color, official: !!s.official, bio: s.bio, since: s.since, sales: s.sales, rating: s.rating } },
      { upsert: true },
    );
  }
  for (const p of SEED_PRODUCTS) {
    await Product.updateOne(
      { slug: p.id },
      {
        $setOnInsert: {
          slug: p.id, name: p.name, cat: p.cat, art: p.art, seller: p.seller, price: p.price, oldPrice: p.old || null,
          rating: p.rating, reviewsCount: p.reviews, sales: p.sales, badge: p.badge || '', tech: p.tech, compat: p.compat,
          type: p.type, version: p.version, desc: p.desc, longDesc: '', feats: p.feats, resmon: p.resmon || null, published: true,
          changelog: [{ version: p.version, date: p.updated, notes: ['Poprawki wydajności przy dużej liczbie graczy', 'Nowe tłumaczenia', 'Zgodność z najnowszym buildem'] }],
        },
      },
      { upsert: true },
    );
  }
  seeded = true;
}

export function toDTO(p: any): ProductDTO {
  const updated = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : '';
  const lastLog = p.changelog?.[0]?.date;
  return {
    id: p.slug,
    slug: p.slug,
    name: p.name,
    cat: p.cat,
    plat: catOf(p.cat).plat,
    art: p.art || 'shield',
    seller: p.seller,
    price: p.price,
    old: p.oldPrice || null,
    rating: Math.round((p.rating || 0) * 10) / 10,
    reviews: p.reviewsCount || 0,
    sales: p.sales || 0,
    badge: p.badge || '',
    tech: p.tech || [],
    compat: p.compat || '',
    type: p.type || '',
    version: p.version || '1.0.0',
    updated: lastLog || updated,
    desc: p.desc || '',
    longDesc: p.longDesc || '',
    feats: p.feats || [],
    resmon: p.resmon || null,
    imageUrl: p.imageUrl || null,
    changelog: (p.changelog || []).map((c: any) => ({ version: c.version, date: c.date, notes: c.notes || [] })),
  };
}

export function sellerDTO(s: any, productCount = 0): SellerDTO {
  return {
    slug: s.slug, name: s.name, color: s.color, official: !!s.official, sales: s.sales || 0,
    products: productCount, rating: s.rating || 5, since: s.since || 2026, bio: s.bio || '',
  };
}

export const getProducts = cache(async (): Promise<ProductDTO[]> => {
  await ensureSeed();
  const list = await Product.find({ published: true }).sort({ sales: -1 }).lean<any[]>();
  return list.map(toDTO);
});

export const getProduct = cache(async (slug: string): Promise<ProductDTO | null> => {
  await ensureSeed();
  const p = await Product.findOne({ slug: String(slug), published: true }).lean<any>();
  return p ? toDTO(p) : null;
});

export const getSellers = cache(async (): Promise<Record<string, SellerDTO>> => {
  await ensureSeed();
  const [sellers, counts] = await Promise.all([
    Seller.find().lean<any[]>(),
    Product.aggregate([{ $match: { published: true } }, { $group: { _id: '$seller', n: { $sum: 1 } } }]),
  ]);
  const cnt = Object.fromEntries(counts.map((c: any) => [c._id, c.n]));
  return Object.fromEntries(sellers.map((s) => [s.slug, sellerDTO(s, cnt[s.slug] || 0)]));
});

/** Bezpieczne pobieranie danych na stronach publicznych — przy braku bazy strona nadal się renderuje. */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error('[data]', (e as Error).message);
    return fallback;
  }
}

/** Dane zapasowe (gdy baza jest niedostępna, np. podczas pierwszej konfiguracji). */
export function fallbackProducts(): ProductDTO[] {
  return SEED_PRODUCTS.map((p) =>
    toDTO({ ...p, slug: p.id, oldPrice: p.old, reviewsCount: p.reviews, changelog: [{ version: p.version, date: p.updated, notes: [] }] }),
  );
}
export function fallbackSellers(): Record<string, SellerDTO> {
  return Object.fromEntries(
    Object.entries(SEED_SELLERS).map(([slug, s]) => [slug, sellerDTO({ ...s, slug }, s.products)]),
  );
}
export const loadProducts = () => safe(getProducts, fallbackProducts());
export const loadSellers = () => safe(getSellers, fallbackSellers());
export const loadProduct = (slug: string) =>
  safe(() => getProduct(slug), fallbackProducts().find((p) => p.slug === slug) || null);
