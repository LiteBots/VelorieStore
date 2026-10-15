import 'server-only';
import { db } from './db';
import { Coupon, License, Order, Product, Seller, nextSeq } from '@/models';
import { catOf, licOf, priceFor, zl } from './catalog';
import { encrypt, generateLicenseKey, hashKey } from './crypto';
import { giveBuyerRole, webhook } from './discord';
import { SITE } from './site';

export interface PricedLine { slug: string; name: string; seller: string; license: string; price: number; plat: string }
export interface Quote { lines: PricedLine[]; subtotal: number; discount: number; total: number; coupon: string | null; couponError: string | null; couponLabel: string | null }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Wycena po stronie serwera — ceny z koszyka przeglądarki są ignorowane. */
export async function quote(items: { slug: string; lic: string }[], couponCode?: string | null): Promise<Quote> {
  await db();
  const uniq = [...new Map(items.map((i) => [i.slug, i])).values()];
  const prods = await Product.find({ slug: { $in: uniq.map((i) => i.slug) }, published: true }).lean<any[]>();
  const bySlug = new Map<string, any>(prods.map((p) => [p.slug, p]));
  const lines: PricedLine[] = [];
  for (const it of uniq) {
    const p = bySlug.get(it.slug);
    if (!p) continue;
    lines.push({ slug: p.slug, name: p.name, seller: p.seller, license: licOf(it.lic).id, price: priceFor(p.price, it.lic), plat: catOf(p.cat).plat });
  }
  const subtotal = r2(lines.reduce((a, l) => a + l.price, 0));
  let discount = 0, coupon: string | null = null, couponError: string | null = null, couponLabel: string | null = null;

  if (couponCode) {
    const c = await Coupon.findOne({ code: String(couponCode).toUpperCase(), active: true }).lean<any>();
    if (!c) couponError = 'Ten kod nie istnieje lub wygasł';
    else if (c.expiresAt && new Date(c.expiresAt) < new Date()) couponError = 'Ten kod wygasł';
    else if (c.maxUses && c.uses >= c.maxUses) couponError = 'Limit użyć kodu został wyczerpany';
    else {
      const eligible = lines.filter((l) => (!c.plat || l.plat === c.plat) && (!c.sellerSlug || l.seller === c.sellerSlug));
      if (!eligible.length) couponError = 'Kod nie obejmuje produktów w koszyku';
      else {
        discount = r2(eligible.reduce((a, l) => a + l.price * (c.pct / 100), 0));
        coupon = c.code;
        couponLabel = `−${c.pct}%${c.plat ? ' na ' + (c.plat === 'fivem' ? 'FiveM' : c.plat === 'minecraft' ? 'Minecraft' : 'Discord i web') : ' na całe zamówienie'}`;
      }
    }
  }
  return { lines, subtotal, discount, total: r2(Math.max(0, subtotal - discount)), coupon, couponError, couponLabel };
}

export async function createOrder(user: { id: string; discordId: string; name: string }, q: Quote, provider: 'demo' | 'stripe', ipHash: string) {
  const seq = await nextSeq('order');
  return Order.create({
    number: `V-${48000 + seq}`,
    userId: user.id,
    discordId: user.discordId,
    username: user.name,
    items: q.lines.map((l) => ({ productSlug: l.slug, name: l.name, seller: l.seller, license: l.license, price: l.price })),
    subtotal: q.subtotal,
    discount: q.discount,
    total: q.total,
    coupon: q.coupon,
    provider,
    ipHash,
    // Dowód zgody konsumenta (regulamin + utrata prawa odstąpienia dla treści cyfrowych).
    note: `Zgody zaakceptowane ${new Date().toISOString()}`,
  });
}

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}

export interface IssuedKey { slug: string; name: string; tier: string; key: string }

/**
 * Realizuje opłacone zamówienie: wystawia licencje, nalicza sprzedaż, wysyła powiadomienia.
 * Idempotentne — drugie wywołanie (np. powtórzony webhook) nic nie zmienia.
 */
export async function fulfillOrder(orderId: string, providerRef?: string): Promise<{ keys: IssuedKey[]; already: boolean }> {
  await db();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'paid', paidAt: new Date(), ...(providerRef ? { providerRef } : {}) } },
    { new: true },
  ).lean<any>();
  if (!order) return { keys: [], already: true };

  const keys: IssuedKey[] = [];
  for (const it of order.items) {
    const tier = licOf(it.license);
    let key = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      key = generateLicenseKey();
      try {
        await License.create({
          keyHash: hashKey(key),
          keyEnc: encrypt(key),
          keyLast4: key.slice(-4),
          userId: order.userId,
          discordId: order.discordId,
          productSlug: it.productSlug,
          orderId: order._id,
          tier: tier.id,
          maxServers: tier.maxServers,
          updatesUntil: tier.updatesMonths ? addMonths(new Date(), tier.updatesMonths) : null,
        });
        break;
      } catch (e: any) {
        if (e?.code !== 11000 || attempt === 3) throw e; // kolizja klucza — losujemy ponownie
      }
    }
    keys.push({ slug: it.productSlug, name: it.name, tier: tier.name, key });
    await Product.updateOne({ slug: it.productSlug }, { $inc: { sales: 1 } });
    await Seller.updateOne({ slug: it.seller }, { $inc: { sales: 1 } });
  }
  if (order.coupon) await Coupon.updateOne({ code: order.coupon }, { $inc: { uses: 1 } });

  webhook('sales', {
    title: `Nowe zamówienie ${order.number}`,
    url: `${SITE.url}/admin/zamowienia`,
    description: order.items.map((i: any) => `• **${i.name}** · ${licOf(i.license).name} · ${zl(i.price)}`).join('\n'),
    fields: [
      { name: 'Klient', value: `<@${order.discordId}> (${order.username})`, inline: true },
      { name: 'Kwota', value: zl(order.total), inline: true },
      { name: 'Płatność', value: order.provider, inline: true },
    ],
  });
  giveBuyerRole(order.discordId).catch(() => {});
  return { keys, already: false };
}

/** Zwrot: zmienia status i unieważnia licencje z zamówienia. */
export async function refundOrder(orderId: string) {
  await db();
  const o = await Order.findOneAndUpdate({ _id: orderId, status: 'paid' }, { $set: { status: 'refunded' } }, { new: true }).lean<any>();
  if (!o) return false;
  await License.updateMany({ orderId: o._id }, { $set: { status: 'revoked' } });
  for (const it of o.items) {
    await Product.updateOne({ slug: it.productSlug, sales: { $gt: 0 } }, { $inc: { sales: -1 } });
  }
  return true;
}

export const paymentsMode = (): 'stripe' | 'demo' | 'off' =>
  process.env.STRIPE_SECRET_KEY ? 'stripe' : process.env.ALLOW_DEMO_PAYMENTS === 'true' ? 'demo' : 'off';
