// Logika koszyka, zamówień, licencji i sald twórców
const env = require('./env');
const { q, tx } = require('./db');
const { HttpError } = require('./http');
const { now, licenseKey, orderNumber } = require('./util');

function ownsProduct(userId, productId) {
  return !!q.get(`SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.buyer_id = ? AND oi.product_id = ? AND o.status = 'paid' LIMIT 1`, userId, productId)
    || !!q.get(`SELECT 1 FROM licenses WHERE user_id = ? AND product_id = ? AND status = 'active' LIMIT 1`, userId, productId);
}

function findCoupon(code) {
  if (!code) return [];
  return q.all(`SELECT * FROM coupons WHERE upper(code) = upper(?) AND active = 1
    AND (expires_at IS NULL OR expires_at > ?) AND (max_uses IS NULL OR uses < max_uses)`, String(code).trim(), now());
}

/** Wycena koszyka. Zwraca pozycje z rabatami, opłatą platformy i ostrzeżeniami. */
function quote(productIds, couponCode, user) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(Number).filter(Number.isInteger))].slice(0, 50);
  const coupons = findCoupon(couponCode);
  const items = [];
  const warnings = [];
  let couponApplied = false;

  for (const id of ids) {
    const p = q.get(`SELECT p.*, u.store_name FROM products p JOIN users u ON u.id = p.seller_id WHERE p.id = ?`, id);
    if (!p || p.status !== 'published') { warnings.push({ product_id: id, message: 'Produkt jest niedostępny' }); continue; }
    if (user && p.seller_id === user.id) { warnings.push({ product_id: id, message: `„${p.title}” to Twój produkt` }); continue; }
    if (user && ownsProduct(user.id, p.id)) { warnings.push({ product_id: id, message: `Masz już „${p.title}”` }); continue; }
    const c = coupons.find((c) => c.seller_id === p.seller_id && (!c.product_id || c.product_id === p.id));
    const discount = c ? Math.round((p.price * c.percent) / 100) : 0;
    if (c) couponApplied = true;
    const paid = p.price - discount;
    const fee = Math.round((paid * env.PLATFORM_FEE_PERCENT) / 100);
    items.push({
      product_id: p.id, seller_id: p.seller_id, title: p.title, slug: p.slug, cover_url: p.cover_url, store_name: p.store_name,
      category: p.category, price: p.price, discount, total: paid, fee, net: paid - fee, coupon_id: c ? c.id : null,
    });
  }
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const discount = items.reduce((s, i) => s + i.discount, 0);
  return {
    items, warnings, subtotal, discount, total: subtotal - discount, currency: env.CURRENCY,
    coupon: couponCode ? { code: String(couponCode).toUpperCase(), valid: couponApplied } : null,
  };
}

function createOrder(user, quoteResult, provider) {
  if (!quoteResult.items.length) throw new HttpError(400, 'Koszyk jest pusty');
  return tx(() => {
    const number = orderNumber();
    const r = q.run(
      `INSERT INTO orders(number, buyer_id, subtotal, discount, total, status, provider, coupon_code, created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
      number, user.id, quoteResult.subtotal, quoteResult.discount, quoteResult.total, 'pending', provider,
      quoteResult.coupon && quoteResult.coupon.valid ? quoteResult.coupon.code : null, now(),
    );
    const orderId = Number(r.lastInsertRowid);
    for (const i of quoteResult.items) {
      q.run(`INSERT INTO order_items(order_id, product_id, seller_id, title, price, discount, fee, net) VALUES(?,?,?,?,?,?,?,?)`,
        orderId, i.product_id, i.seller_id, i.title, i.price, i.discount, i.fee, i.net);
    }
    const usedCoupons = new Set(quoteResult.items.map((i) => i.coupon_id).filter(Boolean));
    for (const cid of usedCoupons) q.run('UPDATE coupons SET uses = uses + 1 WHERE id = ?', cid);
    return q.get('SELECT * FROM orders WHERE id = ?', orderId);
  });
}

/** Opłacenie zamówienia: status + wydanie licencji. Idempotentne. */
function fulfillOrder(orderId, providerRef, paidAt = now()) {
  return tx(() => {
    const order = q.get('SELECT * FROM orders WHERE id = ?', orderId);
    if (!order) throw new HttpError(404, 'Brak zamówienia');
    if (order.status === 'paid') return order;
    q.run(`UPDATE orders SET status = 'paid', paid_at = ?, provider_ref = COALESCE(?, provider_ref) WHERE id = ?`, paidAt, providerRef || null, orderId);
    const items = q.all('SELECT oi.*, p.max_activations FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?', orderId);
    for (const it of items) {
      q.run(`INSERT INTO licenses(license_key, product_id, user_id, order_item_id, status, max_activations, created_at) VALUES(?,?,?,?,?,?,?)`,
        licenseKey(), it.product_id, order.buyer_id, it.id, 'active', it.max_activations ?? 1, paidAt);
    }
    return q.get('SELECT * FROM orders WHERE id = ?', orderId);
  });
}

function sellerBalance(sellerId) {
  const earned = q.get(`SELECT COALESCE(SUM(oi.net),0) v FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.seller_id = ? AND o.status = 'paid'`, sellerId).v;
  const paidOut = q.get(`SELECT COALESCE(SUM(amount),0) v FROM payouts WHERE seller_id = ? AND status = 'paid'`, sellerId).v;
  const pending = q.get(`SELECT COALESCE(SUM(amount),0) v FROM payouts WHERE seller_id = ? AND status = 'pending'`, sellerId).v;
  return { earned, paid_out: paidOut, pending, available: earned - paidOut - pending };
}

module.exports = { ownsProduct, quote, createOrder, fulfillOrder, sellerBalance };
