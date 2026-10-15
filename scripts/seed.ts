/**
 * Wgrywa produkty i twórców demonstracyjnych (tylko brakujące — niczego nie nadpisuje).
 * Użycie:  MONGODB_URI="..." npm run seed
 */
import mongoose from 'mongoose';
import { SEED_PRODUCTS, SEED_SELLERS } from '../lib/seed-data';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Ustaw MONGODB_URI');
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'velorie' });
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false, timestamps: true }));
  const Seller = mongoose.model('Seller', new mongoose.Schema({}, { strict: false, timestamps: true }));
  let s = 0, p = 0;
  for (const [slug, v] of Object.entries(SEED_SELLERS)) {
    const r = await Seller.updateOne({ slug }, { $setOnInsert: { slug, name: v.name, color: v.color, official: !!v.official, verified: true, bio: v.bio, since: v.since, sales: v.sales, rating: v.rating } }, { upsert: true });
    s += r.upsertedCount;
  }
  for (const x of SEED_PRODUCTS) {
    const r = await Product.updateOne(
      { slug: x.id },
      { $setOnInsert: {
        slug: x.id, name: x.name, cat: x.cat, art: x.art, seller: x.seller, price: x.price, oldPrice: x.old || null, rating: x.rating,
        reviewsCount: x.reviews, sales: x.sales, badge: x.badge || '', tech: x.tech, compat: x.compat, type: x.type, version: x.version,
        desc: x.desc, longDesc: '', feats: x.feats, resmon: x.resmon || null, published: true, imageUrl: null, downloadUrl: null,
        changelog: [{ version: x.version, date: x.updated, notes: ['Pierwsze wydanie na Velorie Market'] }],
      } },
      { upsert: true },
    );
    p += r.upsertedCount;
  }
  console.log(`Gotowe: dodano ${s} twórców i ${p} produktów.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
