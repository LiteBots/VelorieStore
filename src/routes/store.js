const fs = require('fs');
const path = require('path');
const env = require('../env');
const { Router, HttpError, readJson, readRaw, send } = require('../http');
const { q, getSetting } = require('../db');
const { requireAuth } = require('../auth');
const { now, CATEGORIES, CATEGORY_IDS, str, int, productRow } = require('../util');
const C = require('../commerce');
const payments = require('../payments');

const r = new Router();

const PRODUCT_SELECT = `
  SELECT p.*, u.store_name, u.store_slug, u.avatar_url AS seller_avatar,
    (SELECT ROUND(AVG(rating), 2) FROM reviews rv WHERE rv.product_id = p.id) AS rating,
    (SELECT COUNT(*) FROM reviews rv WHERE rv.product_id = p.id) AS reviews_count,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status = 'paid') AS sales
  FROM products p JOIN users u ON u.id = p.seller_id`;

function publicProduct(p) {
  if (!p) return p;
  const { file_path, ...rest } = productRow(p);
  return { ...rest, has_file: !!file_path };
}

r.get('/api/categories', () => {
  const counts = Object.fromEntries(q.all(`SELECT category, COUNT(*) n FROM products WHERE status = 'published' GROUP BY category`).map((x) => [x.category, x.n]));
  return CATEGORIES.map((c) => ({ ...c, count: counts[c.id] || 0 }));
});

r.get('/api/stats/public', () => ({
  products: q.get(`SELECT COUNT(*) n FROM products WHERE status = 'published'`).n,
  creators: q.get(`SELECT COUNT(*) n FROM users WHERE is_seller = 1`).n,
  sales: q.get(`SELECT COUNT(*) n FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status = 'paid'`).n,
  users: q.get(`SELECT COUNT(*) n FROM users`).n,
  fee_percent: env.PLATFORM_FEE_PERCENT,
  payment_provider: payments.current().name,
}));

r.get('/api/infobar', () => getSetting('infobar', { isActive: false }));

r.get('/api/products', (req) => {
  const { q: search, category, sort = 'new', seller, featured, free } = req.query;
  const where = [`p.status = 'published'`];
  const params = [];
  if (search) {
    where.push(`(p.title LIKE ? OR p.summary LIKE ? OR p.tags LIKE ? OR u.store_name LIKE ?)`);
    const s = `%${String(search).slice(0, 80)}%`;
    params.push(s, s, s, s);
  }
  if (category) {
    const cats = String(category).split(',').filter((c) => CATEGORY_IDS.has(c));
    if (cats.length) { where.push(`p.category IN (${cats.map(() => '?').join(',')})`); params.push(...cats); }
  }
  if (seller) { where.push('u.store_slug = ?'); params.push(String(seller)); }
  if (featured === '1') where.push('p.featured = 1');
  if (free === '1') where.push('p.price = 0');
  if (req.query.min) { where.push('p.price >= ?'); params.push(int(req.query.min, { min: 0 }) * 100); }
  if (req.query.max) { where.push('p.price <= ?'); params.push(int(req.query.max, { min: 0 }) * 100); }
  const order = {
    new: 'created_at DESC', popular: 'sales DESC, views DESC', rating: 'rating IS NULL, rating DESC, reviews_count DESC',
    price_asc: 'price ASC', price_desc: 'price DESC', updated: 'updated_at DESC',
  }[sort] || 'created_at DESC';
  const limit = int(req.query.limit, { min: 1, max: 60, def: 24 });
  const page = int(req.query.page, { min: 1, max: 1000, def: 1 });
  const base = `SELECT * FROM (${PRODUCT_SELECT} WHERE ${where.join(' AND ')})`;
  const total = q.get(`SELECT COUNT(*) n FROM (${base})`, ...params).n;
  const items = q.all(`${base} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit, (page - 1) * limit).map(publicProduct);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
});

r.get('/api/products/:slug', (req) => {
  const p = q.get(`${PRODUCT_SELECT} WHERE p.slug = ?`, req.params.slug);
  const isOwner = p && req.user && (req.user.id === p.seller_id || req.user.is_admin);
  if (!p || (p.status !== 'published' && !isOwner)) throw new HttpError(404, 'Nie znaleziono produktu');
  q.run('UPDATE products SET views = views + 1 WHERE id = ?', p.id);
  const versions = q.all('SELECT version, changelog, created_at FROM product_versions WHERE product_id = ? ORDER BY created_at DESC LIMIT 20', p.id);
  const seller = q.get(`SELECT u.id, u.store_name, u.store_slug, u.avatar_url, u.bio, u.created_at,
    (SELECT COUNT(*) FROM products WHERE seller_id = u.id AND status = 'published') products,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = u.id AND o.status = 'paid') sales
    FROM users u WHERE u.id = ?`, p.seller_id);
  const dist = q.all('SELECT rating, COUNT(*) n FROM reviews WHERE product_id = ? GROUP BY rating', p.id);
  return {
    product: publicProduct(p), versions, seller,
    rating_distribution: Object.fromEntries(dist.map((d) => [d.rating, d.n])),
    owned: req.user ? C.ownsProduct(req.user.id, p.id) : false,
    is_owner: !!isOwner,
    wishlisted: req.user ? !!q.get('SELECT 1 FROM wishlist WHERE user_id = ? AND product_id = ?', req.user.id, p.id) : false,
    my_review: req.user ? q.get('SELECT rating, comment FROM reviews WHERE user_id = ? AND product_id = ?', req.user.id, p.id) || null : null,
    related: q.all(`${PRODUCT_SELECT} WHERE p.status = 'published' AND p.category = ? AND p.id != ? ORDER BY sales DESC LIMIT 4`, p.category, p.id).map(publicProduct),
  };
});

r.get('/api/products/:id/reviews', (req) => q.all(`SELECT r.id, r.rating, r.comment, r.created_at, u.username, u.avatar_url
  FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 100`, Number(req.params.id)));

r.post('/api/products/:id/reviews', requireAuth, async (req) => {
  const pid = Number(req.params.id);
  if (!C.ownsProduct(req.user.id, pid)) throw new HttpError(403, 'Recenzję może wystawić tylko osoba, która kupiła produkt');
  const b = await readJson(req);
  const rating = int(b.rating, { min: 1, max: 5, name: 'Ocena' });
  const comment = str(b.comment, { max: 1500, name: 'Komentarz' });
  q.run(`INSERT INTO reviews(product_id, user_id, rating, comment, created_at) VALUES(?,?,?,?,?)
    ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = excluded.created_at`,
  pid, req.user.id, rating, comment, now());
  return { ok: true };
});

r.get('/api/sellers/:slug', (req) => {
  const s = q.get(`SELECT id, store_name, store_slug, avatar_url, bio, created_at, discord_username FROM users WHERE store_slug = ? AND is_seller = 1`, req.params.slug);
  if (!s) throw new HttpError(404, 'Nie znaleziono twórcy');
  const stats = q.get(`SELECT
    (SELECT COUNT(*) FROM products WHERE seller_id = ? AND status = 'published') products,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = ? AND o.status = 'paid') sales,
    (SELECT ROUND(AVG(r.rating), 2) FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.seller_id = ?) rating,
    (SELECT COUNT(*) FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.seller_id = ?) reviews`, s.id, s.id, s.id, s.id);
  const products = q.all(`${PRODUCT_SELECT} WHERE p.seller_id = ? AND p.status = 'published' ORDER BY sales DESC`, s.id).map(publicProduct);
  delete s.id;
  return { seller: s, stats, products };
});

// ---------- Koszyk i zakup ----------
r.post('/api/cart/quote', async (req) => {
  const b = await readJson(req);
  return C.quote(b.items, b.coupon, req.user);
});

r.post('/api/checkout', requireAuth, async (req) => {
  const b = await readJson(req);
  const qt = C.quote(b.items, b.coupon, req.user);
  if (!qt.items.length) throw new HttpError(400, qt.warnings[0] ? qt.warnings[0].message : 'Koszyk jest pusty', { warnings: qt.warnings });
  const provider = qt.total === 0 ? { name: 'free', createPayment: async () => ({ type: 'instant', ref: 'free' }) } : payments.current();
  const order = C.createOrder(req.user, qt, provider.name);
  let pay;
  try { pay = await provider.createPayment(order, qt.items, req.user); }
  catch (e) {
    q.run(`UPDATE orders SET status = 'failed' WHERE id = ?`, order.id);
    throw new HttpError(502, 'Błąd bramki płatności: ' + e.message);
  }
  if (pay.type === 'instant') {
    C.fulfillOrder(order.id, pay.ref);
    return { order_number: order.number, status: 'paid', redirect: `/koszyk.html?order=${order.number}&status=success` };
  }
  q.run('UPDATE orders SET provider_ref = ? WHERE id = ?', pay.ref || null, order.id);
  return { order_number: order.number, status: 'pending', redirect: pay.url };
});

r.post('/api/payments/:provider/webhook', async (req) => {
  const p = payments.PROVIDERS[req.params.provider];
  if (!p || !p.handleWebhook) throw new HttpError(404, 'Brak providera');
  const raw = (await readRaw(req, 2 * 1024 * 1024)).toString('utf8');
  let result;
  try { result = p.handleWebhook(req, raw); } catch (e) { throw new HttpError(400, e.message); }
  if (result && result.orderId) C.fulfillOrder(result.orderId, result.ref);
  return { received: true };
});

// ---------- Pobieranie plików ----------
r.get('/api/products/:id/download', requireAuth, (req, res) => {
  const p = q.get('SELECT * FROM products WHERE id = ?', Number(req.params.id));
  if (!p) throw new HttpError(404, 'Nie znaleziono produktu');
  const allowed = p.seller_id === req.user.id || req.user.is_admin || C.ownsProduct(req.user.id, p.id);
  if (!allowed) throw new HttpError(403, 'Nie posiadasz tego produktu');
  const lic = q.get(`SELECT status FROM licenses WHERE user_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1`, req.user.id, p.id);
  if (lic && lic.status === 'revoked' && p.seller_id !== req.user.id) throw new HttpError(403, 'Licencja została unieważniona');
  if (!p.file_path) throw new HttpError(404, 'Twórca nie dodał jeszcze pliku');
  const file = path.join(env.FILES_DIR, path.basename(p.file_path));
  if (!fs.existsSync(file)) throw new HttpError(404, 'Plik nie istnieje');
  q.run('UPDATE products SET downloads = downloads + 1 WHERE id = ?', p.id);
  const name = (p.file_name || 'plik').replace(/[^\w.\- ]+/g, '_');
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': fs.statSync(file).size,
    'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(p.file_name || 'plik')}`,
  });
  fs.createReadStream(file).pipe(res);
});

module.exports = { router: r, PRODUCT_SELECT, publicProduct };
