// Panel twórcy (klient biznesowy)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../env');
const { Router, HttpError, readJson, streamToFile } = require('../http');
const { q, tx } = require('../db');
const A = require('../auth');
const C = require('../commerce');
const { now, CATEGORY_IDS, CATEGORIES, uniqueSlug, str, int, isEmail, licenseKey, publicUser, productRow } = require('../util');

const r = new Router();
const seller = A.requireSeller;
const DAY = 86400_000;

function ownProduct(req, id = req.params.id) {
  const p = q.get('SELECT * FROM products WHERE id = ? AND seller_id = ?', Number(id), req.user.id);
  if (!p) throw new HttpError(404, 'Nie znaleziono produktu');
  return p;
}

// ---------- Statystyki ----------
r.get('/api/seller/stats', seller, (req) => {
  const sid = req.user.id;
  const days = [7, 30, 90, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const end = now();
  const start = new Date(new Date(end - (days - 1) * DAY).toDateString()).getTime();
  const prevStart = start - days * DAY;

  const rows = q.all(`SELECT oi.*, o.paid_at, o.buyer_id, p.category FROM order_items oi
    JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
    WHERE oi.seller_id = ? AND o.status = 'paid' AND o.paid_at >= ?`, sid, prevStart);
  const cur = rows.filter((x) => x.paid_at >= start);
  const prev = rows.filter((x) => x.paid_at < start);
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const delta = (a, b) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10);

  const series = [];
  const byDay = new Map();
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t);
    const key = d.toISOString().slice(0, 10);
    const o = { date: key, revenue: 0, net: 0, sales: 0 };
    byDay.set(new Date(d.toDateString()).getTime(), o);
    series.push(o);
  }
  for (const x of cur) {
    const o = byDay.get(new Date(new Date(x.paid_at).toDateString()).getTime());
    if (o) { o.revenue += x.price - x.discount; o.net += x.net; o.sales++; }
  }

  const top = {};
  for (const x of cur) {
    top[x.product_id] ??= { product_id: x.product_id, title: x.title, revenue: 0, sales: 0 };
    top[x.product_id].revenue += x.price - x.discount;
    top[x.product_id].sales++;
  }
  const cats = {};
  for (const x of cur) cats[x.category] = (cats[x.category] || 0) + x.price - x.discount;
  const catNames = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

  const totals = q.get(`SELECT
    (SELECT COUNT(*) FROM products WHERE seller_id = ? AND status = 'published') published,
    (SELECT COUNT(*) FROM products WHERE seller_id = ?) products,
    (SELECT COALESCE(SUM(views),0) FROM products WHERE seller_id = ?) views,
    (SELECT COALESCE(SUM(downloads),0) FROM products WHERE seller_id = ?) downloads,
    (SELECT ROUND(AVG(r.rating),2) FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.seller_id = ?) rating,
    (SELECT COUNT(*) FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.seller_id = ?) reviews,
    (SELECT COUNT(*) FROM licenses l JOIN products p ON p.id = l.product_id WHERE p.seller_id = ? AND l.status = 'active') licenses,
    (SELECT COUNT(*) FROM license_activations a JOIN licenses l ON l.id = a.license_id JOIN products p ON p.id = l.product_id WHERE p.seller_id = ? AND a.last_seen > ?) active_servers,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = ? AND o.status = 'paid') all_sales,
    (SELECT COALESCE(SUM(oi.price - oi.discount),0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.seller_id = ? AND o.status = 'paid') all_revenue`,
  sid, sid, sid, sid, sid, sid, sid, sid, end - 7 * DAY, sid, sid);

  const revenue = cur.reduce((s, x) => s + x.price - x.discount, 0);
  const prevRevenue = prev.reduce((s, x) => s + x.price - x.discount, 0);
  const recent = q.all(`SELECT oi.title, oi.price, oi.discount, oi.net, o.paid_at, o.number, u.username
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
    WHERE oi.seller_id = ? AND o.status = 'paid' ORDER BY o.paid_at DESC LIMIT 8`, sid);

  return {
    days,
    kpi: {
      revenue, revenue_delta: delta(revenue, prevRevenue),
      net: sum(cur, 'net'), net_delta: delta(sum(cur, 'net'), sum(prev, 'net')),
      sales: cur.length, sales_delta: delta(cur.length, prev.length),
      buyers: new Set(cur.map((x) => x.buyer_id)).size,
      avg_order: cur.length ? Math.round(revenue / cur.length) : 0,
      fees: sum(cur, 'fee'),
      conversion: totals.views ? Math.round((totals.all_sales / totals.views) * 1000) / 10 : 0,
    },
    totals,
    balance: C.sellerBalance(sid),
    series,
    top_products: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    categories: Object.entries(cats).map(([id, v]) => ({ id, name: catNames[id] || id, revenue: v })).sort((a, b) => b.revenue - a.revenue),
    recent_sales: recent,
    fee_percent: env.PLATFORM_FEE_PERCENT,
  };
});

// ---------- Produkty ----------
r.get('/api/seller/products', seller, (req) => q.all(`SELECT p.*,
    (SELECT COUNT(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status = 'paid') sales,
    (SELECT COALESCE(SUM(oi.price - oi.discount),0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status = 'paid') revenue,
    (SELECT ROUND(AVG(rating),2) FROM reviews WHERE product_id = p.id) rating
  FROM products p WHERE seller_id = ? ORDER BY updated_at DESC`, req.user.id).map((p) => ({ ...productRow(p), file_path: undefined, has_file: !!p.file_path })));

r.get('/api/seller/products/:id', seller, (req) => {
  const p = ownProduct(req);
  return { ...productRow(p), file_path: undefined, has_file: !!p.file_path, versions: q.all('SELECT * FROM product_versions WHERE product_id = ? ORDER BY created_at DESC', p.id) };
});

function productFields(b, existing = {}) {
  const pick = (k) => (b[k] !== undefined ? b[k] : existing[k]);
  const category = String(pick('category') || '');
  if (!CATEGORY_IDS.has(category)) throw new HttpError(400, 'Wybierz kategorię');
  const status = String(pick('status') || 'draft');
  if (!['draft', 'published'].includes(status) && !(existing.status === 'blocked' && status === 'blocked')) throw new HttpError(400, 'Nieprawidłowy status');
  const priceRaw = b.price_pln !== undefined ? Math.round(Number(String(b.price_pln).replace(',', '.')) * 100) : pick('price');
  return {
    title: str(pick('title'), { name: 'Tytuł', required: true, min: 3, max: 90 }),
    summary: str(pick('summary'), { name: 'Krótki opis', max: 200 }),
    description: str(pick('description'), { name: 'Opis', max: 20000 }),
    category,
    price: int(priceRaw, { min: 0, max: 10_000_00, name: 'Cena' }),
    tags: str(Array.isArray(pick('tags')) ? pick('tags').join(',') : pick('tags'), { max: 300 }).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12).join(','),
    version: str(pick('version') || '1.0.0', { max: 20 }),
    compatibility: str(pick('compatibility'), { max: 120 }),
    license_enabled: pick('license_enabled') ? 1 : 0,
    max_activations: int(pick('max_activations'), { min: 0, max: 1000, def: 1 }),
    status,
  };
}

r.post('/api/seller/products', seller, async (req) => {
  const f = productFields(await readJson(req));
  const slug = uniqueSlug('products', 'slug', f.title);
  const t = now();
  const res = q.run(`INSERT INTO products(seller_id, title, slug, summary, description, category, price, tags, version, compatibility, license_enabled, max_activations, status, created_at, updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, req.user.id, f.title, slug, f.summary, f.description, f.category, f.price, f.tags, f.version, f.compatibility, f.license_enabled, f.max_activations, f.status, t, t);
  q.run('INSERT INTO product_versions(product_id, version, changelog, created_at) VALUES(?,?,?,?)', res.lastInsertRowid, f.version, 'Pierwsze wydanie', t);
  return { id: Number(res.lastInsertRowid), slug };
});

r.patch('/api/seller/products/:id', seller, async (req) => {
  const p = ownProduct(req);
  const b = await readJson(req);
  if (p.status === 'blocked') b.status = 'blocked';
  const f = productFields(b, p);
  const slug = f.title !== p.title ? uniqueSlug('products', 'slug', f.title, p.id) : p.slug;
  q.run(`UPDATE products SET title=?, slug=?, summary=?, description=?, category=?, price=?, tags=?, version=?, compatibility=?, license_enabled=?, max_activations=?, status=?, updated_at=? WHERE id = ?`,
    f.title, slug, f.summary, f.description, f.category, f.price, f.tags, f.version, f.compatibility, f.license_enabled, f.max_activations, f.status, now(), p.id);
  return { ok: true, slug };
});

r.delete('/api/seller/products/:id', seller, (req) => {
  const p = ownProduct(req);
  const sold = q.get('SELECT COUNT(*) n FROM order_items WHERE product_id = ?', p.id).n;
  if (sold > 0) {
    // Produkt ze sprzedażą: ukrywamy, by kupujący nie stracili dostępu
    q.run(`UPDATE products SET status = 'draft', updated_at = ? WHERE id = ?`, now(), p.id);
    return { ok: true, archived: true };
  }
  if (p.file_path) fs.rm(path.join(env.FILES_DIR, path.basename(p.file_path)), () => {});
  q.run('DELETE FROM products WHERE id = ?', p.id);
  return { ok: true };
});

const IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

r.put('/api/seller/products/:id/cover', seller, async (req) => {
  const p = ownProduct(req);
  const ext = IMG[req.headers['content-type']];
  if (!ext) throw new HttpError(400, 'Dozwolone: PNG, JPG, WEBP, GIF');
  const name = `p${p.id}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  await streamToFile(req, path.join(env.PUBLIC_DIR, 'uploads', 'covers', name), 6 * 1024 * 1024);
  const url = `/uploads/covers/${name}`;
  q.run('UPDATE products SET cover_url = ?, updated_at = ? WHERE id = ?', url, now(), p.id);
  return { cover_url: url };
});

r.post('/api/seller/products/:id/gallery', seller, async (req) => {
  const p = ownProduct(req);
  const gallery = productRow(p).gallery;
  if (gallery.length >= 10) throw new HttpError(400, 'Maksymalnie 10 zdjęć w galerii');
  const ext = IMG[req.headers['content-type']];
  if (!ext) throw new HttpError(400, 'Dozwolone: PNG, JPG, WEBP, GIF');
  const name = `g${p.id}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  await streamToFile(req, path.join(env.PUBLIC_DIR, 'uploads', 'gallery', name), 6 * 1024 * 1024);
  gallery.push(`/uploads/gallery/${name}`);
  q.run('UPDATE products SET gallery = ?, updated_at = ? WHERE id = ?', JSON.stringify(gallery), now(), p.id);
  return { gallery };
});

r.delete('/api/seller/products/:id/gallery/:idx', seller, (req) => {
  const p = ownProduct(req);
  const gallery = productRow(p).gallery;
  gallery.splice(Number(req.params.idx), 1);
  q.run('UPDATE products SET gallery = ? WHERE id = ?', JSON.stringify(gallery), p.id);
  return { gallery };
});

r.put('/api/seller/products/:id/file', seller, async (req) => {
  const p = ownProduct(req);
  const original = String(req.query.name || 'plik.zip').replace(/[\\/]/g, '_').slice(0, 120);
  const stored = `f${p.id}-${crypto.randomBytes(8).toString('hex')}${path.extname(original).slice(0, 10)}`;
  const size = await streamToFile(req, path.join(env.FILES_DIR, stored), env.MAX_PRODUCT_FILE_MB * 1024 * 1024);
  if (p.file_path) fs.rm(path.join(env.FILES_DIR, path.basename(p.file_path)), () => {});
  q.run('UPDATE products SET file_path = ?, file_name = ?, file_size = ?, updated_at = ? WHERE id = ?', stored, original, size, now(), p.id);
  return { file_name: original, file_size: size };
});

r.post('/api/seller/products/:id/versions', seller, async (req) => {
  const p = ownProduct(req);
  const b = await readJson(req);
  const version = str(b.version, { name: 'Wersja', required: true, max: 20 });
  const changelog = str(b.changelog, { name: 'Lista zmian', max: 5000 });
  q.run('INSERT INTO product_versions(product_id, version, changelog, created_at) VALUES(?,?,?,?)', p.id, version, changelog, now());
  q.run('UPDATE products SET version = ?, updated_at = ? WHERE id = ?', version, now(), p.id);
  return { ok: true };
});

// ---------- Sprzedaż ----------
r.get('/api/seller/sales', seller, (req) => {
  const limit = 50;
  const page = int(req.query.page, { min: 1, def: 1 });
  const where = [`oi.seller_id = ?`, `o.status = 'paid'`];
  const params = [req.user.id];
  if (req.query.product) { where.push('oi.product_id = ?'); params.push(Number(req.query.product)); }
  const total = q.get(`SELECT COUNT(*) n FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${where.join(' AND ')}`, ...params).n;
  const items = q.all(`SELECT oi.id, oi.title, oi.product_id, oi.price, oi.discount, oi.fee, oi.net, o.number, o.paid_at, o.coupon_code, u.username, u.email
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
    WHERE ${where.join(' AND ')} ORDER BY o.paid_at DESC LIMIT ? OFFSET ?`, ...params, limit, (page - 1) * limit);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
});

r.get('/api/seller/sales.csv', seller, (req, res) => {
  const rows = q.all(`SELECT o.number, datetime(o.paid_at/1000,'unixepoch') paid_at, oi.title, u.username, u.email, oi.price, oi.discount, oi.fee, oi.net, o.coupon_code
    FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN users u ON u.id = o.buyer_id
    WHERE oi.seller_id = ? AND o.status = 'paid' ORDER BY o.paid_at DESC`, req.user.id);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const pln = (v) => (v / 100).toFixed(2);
  const csv = ['zamowienie;data;produkt;kupujacy;email;cena;rabat;prowizja;netto;kupon',
    ...rows.map((r) => [r.number, r.paid_at, r.title, r.username, r.email, pln(r.price), pln(r.discount), pln(r.fee), pln(r.net), r.coupon_code].map(esc).join(';'))].join('\n');
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="velorie-sprzedaz.csv"' });
  res.end('﻿' + csv);
});

// ---------- Licencje klientów ----------
r.get('/api/seller/licenses', seller, (req) => {
  const where = ['p.seller_id = ?'];
  const params = [req.user.id];
  if (req.query.product) { where.push('p.id = ?'); params.push(Number(req.query.product)); }
  if (req.query.q) { where.push('(l.license_key LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'); const s = `%${req.query.q}%`; params.push(s, s, s); }
  return q.all(`SELECT l.id, l.license_key, l.status, l.max_activations, l.created_at, l.note, p.title, p.id AS product_id, u.username, u.email,
      (SELECT COUNT(*) FROM license_activations a WHERE a.license_id = l.id) activations,
      (SELECT MAX(last_seen) FROM license_activations a WHERE a.license_id = l.id) last_seen
    FROM licenses l JOIN products p ON p.id = l.product_id JOIN users u ON u.id = l.user_id
    WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC LIMIT 300`, ...params);
});

function ownLicense(req) {
  const l = q.get('SELECT l.* FROM licenses l JOIN products p ON p.id = l.product_id WHERE l.id = ? AND p.seller_id = ?', Number(req.params.id), req.user.id);
  if (!l) throw new HttpError(404, 'Nie znaleziono licencji');
  return l;
}

r.patch('/api/seller/licenses/:id', seller, async (req) => {
  const l = ownLicense(req);
  const b = await readJson(req);
  const status = b.status !== undefined ? String(b.status) : l.status;
  if (!['active', 'revoked'].includes(status)) throw new HttpError(400, 'Nieprawidłowy status');
  const max = int(b.max_activations, { min: 0, max: 1000, def: l.max_activations });
  q.run('UPDATE licenses SET status = ?, max_activations = ?, note = ? WHERE id = ?', status, max, str(b.note ?? l.note, { max: 200 }), l.id);
  return { ok: true };
});

r.post('/api/seller/licenses/:id/reset', seller, (req) => {
  const l = ownLicense(req);
  q.run('DELETE FROM license_activations WHERE license_id = ?', l.id);
  return { ok: true };
});

// Ręczne wydanie licencji (giveaway, partner, reklamacja)
r.post('/api/seller/licenses', seller, async (req) => {
  const b = await readJson(req);
  const p = ownProduct(req, b.product_id);
  const email = String(b.email || '').trim().toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Podaj e-mail istniejącego konta');
  const u = q.get('SELECT * FROM users WHERE lower(email) = ?', email);
  if (!u) throw new HttpError(404, 'Nie znaleziono konta z tym adresem');
  if (C.ownsProduct(u.id, p.id)) throw new HttpError(409, 'Ten użytkownik ma już ten produkt');
  const key = licenseKey();
  q.run('INSERT INTO licenses(license_key, product_id, user_id, status, max_activations, note, created_at) VALUES(?,?,?,?,?,?,?)',
    key, p.id, u.id, 'active', p.max_activations, str(b.note || 'Wydana ręcznie', { max: 200 }), now());
  return { license_key: key };
});

// ---------- Kody rabatowe ----------
r.get('/api/seller/coupons', seller, (req) => q.all(`SELECT c.*, p.title AS product_title FROM coupons c LEFT JOIN products p ON p.id = c.product_id
  WHERE c.seller_id = ? ORDER BY c.created_at DESC`, req.user.id));

r.post('/api/seller/coupons', seller, async (req) => {
  const b = await readJson(req);
  const code = str(b.code, { name: 'Kod', required: true, min: 3, max: 24 }).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const percent = int(b.percent, { min: 1, max: 100, name: 'Rabat %' });
  const productId = b.product_id ? ownProduct(req, b.product_id).id : null;
  const maxUses = b.max_uses ? int(b.max_uses, { min: 1, max: 100000 }) : null;
  const expires = b.expires_at ? new Date(b.expires_at).getTime() : null;
  if (q.get('SELECT id FROM coupons WHERE seller_id = ? AND code = ?', req.user.id, code)) throw new HttpError(409, 'Masz już taki kod');
  q.run('INSERT INTO coupons(seller_id, code, percent, product_id, max_uses, expires_at, created_at) VALUES(?,?,?,?,?,?,?)', req.user.id, code, percent, productId, maxUses, expires, now());
  return { ok: true };
});

r.patch('/api/seller/coupons/:id', seller, async (req) => {
  const b = await readJson(req);
  q.run('UPDATE coupons SET active = ? WHERE id = ? AND seller_id = ?', b.active ? 1 : 0, Number(req.params.id), req.user.id);
  return { ok: true };
});
r.delete('/api/seller/coupons/:id', seller, (req) => {
  q.run('DELETE FROM coupons WHERE id = ? AND seller_id = ?', Number(req.params.id), req.user.id);
  return { ok: true };
});

// ---------- Recenzje ----------
r.get('/api/seller/reviews', seller, (req) => q.all(`SELECT r.*, p.title, p.slug, u.username, u.avatar_url FROM reviews r
  JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id WHERE p.seller_id = ? ORDER BY r.created_at DESC LIMIT 200`, req.user.id));

// ---------- Wypłaty ----------
r.get('/api/seller/payouts', seller, (req) => ({
  balance: C.sellerBalance(req.user.id),
  min_payout: env.MIN_PAYOUT,
  method: req.user.payout_method, details: req.user.payout_details,
  history: q.all('SELECT * FROM payouts WHERE seller_id = ? ORDER BY created_at DESC', req.user.id),
}));

r.post('/api/seller/payouts', seller, async (req) => {
  const b = await readJson(req);
  const amount = Math.round(Number(String(b.amount_pln || 0).replace(',', '.')) * 100);
  if (!req.user.payout_method || !req.user.payout_details) throw new HttpError(400, 'Najpierw ustaw metodę wypłaty w ustawieniach sklepu');
  return tx(() => {
    const bal = C.sellerBalance(req.user.id);
    if (amount < env.MIN_PAYOUT) throw new HttpError(400, `Minimalna wypłata to ${(env.MIN_PAYOUT / 100).toFixed(2)} zł`);
    if (amount > bal.available) throw new HttpError(400, 'Kwota przekracza dostępne saldo');
    q.run('INSERT INTO payouts(seller_id, amount, method, details, created_at) VALUES(?,?,?,?,?)', req.user.id, amount, req.user.payout_method, req.user.payout_details, now());
    return { ok: true };
  });
});

// ---------- Ustawienia sklepu ----------
r.patch('/api/seller/store', seller, async (req) => {
  const b = await readJson(req);
  const name = str(b.store_name ?? req.user.store_name, { name: 'Nazwa sklepu', required: true, min: 3, max: 40 });
  const slug = name !== req.user.store_name ? uniqueSlug('users', 'store_slug', name, req.user.id) : req.user.store_slug;
  const method = b.payout_method !== undefined ? String(b.payout_method) : req.user.payout_method;
  if (method && !['bank', 'paypal', 'revolut'].includes(method)) throw new HttpError(400, 'Nieprawidłowa metoda wypłaty');
  q.run('UPDATE users SET store_name = ?, store_slug = ?, bio = ?, payout_method = ?, payout_details = ? WHERE id = ?',
    name, slug, str(b.bio ?? req.user.bio, { max: 500 }), method || null, str(b.payout_details ?? req.user.payout_details, { max: 120 }) || null, req.user.id);
  return { user: publicUser(q.get('SELECT * FROM users WHERE id = ?', req.user.id)) };
});

module.exports = r;
