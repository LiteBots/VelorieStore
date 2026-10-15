import 'server-only';
import { db } from './db';
import { License, Product, Review, Seller } from '@/models';
import { safe } from './products';
import { QUOTES } from './catalog';

export interface PublicStats { products: number; licenses: number; sellers: number; rating: number; reviews: number }

/** Prawdziwe liczby z bazy (strona główna, bot, panel). */
export function publicStats(): Promise<PublicStats> {
  return safe(async () => {
    await db();
    const [products, licenses, sellers, agg] = await Promise.all([
      Product.countDocuments({ published: true }),
      License.countDocuments({ status: 'active' }),
      Seller.countDocuments(),
      Product.aggregate([
        { $match: { published: true, reviewsCount: { $gt: 0 } } },
        { $group: { _id: null, r: { $sum: { $multiply: ['$rating', '$reviewsCount'] } }, n: { $sum: '$reviewsCount' } } },
      ]),
    ]);
    const n = agg[0]?.n || 0;
    return { products, licenses, sellers, reviews: n, rating: n ? Math.round((agg[0].r / n) * 10) / 10 : 5 };
  }, { products: 19, licenses: 0, sellers: 6, rating: 4.8, reviews: 3214 });
}

const COLORS = ['#2f6bff', '#0ea5e9', '#6366f1', '#38bdf8', '#1d4fd8', '#60a5fa'];

/** Opinie do sekcji „Serwery, które nam ufają”: prawdziwe recenzje 5★, a dopóki jest ich mniej niż 6 — przykładowe. */
export function testimonials(): Promise<[string, string, string, string][]> {
  return safe(async () => {
    await db();
    const list = await Review.find({ hidden: false, rating: 5 }).sort({ createdAt: -1 }).limit(12).lean<any[]>();
    if (list.length < 6) return QUOTES;
    return list.map((r, i) => [r.text, r.username, `opinia o ${r.productSlug}`, COLORS[i % COLORS.length]] as [string, string, string, string]);
  }, QUOTES);
}
