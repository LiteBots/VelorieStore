// Panel kupującego
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../env');
const { Router, HttpError, readJson, streamToFile } = require('../http');
const { q } = require('../db');
const A = require('../auth');
const { now, str, publicUser, productRow } = require('../util');

const r = new Router();
const auth = A.requireAuth;

r.get('/api/me/overview', auth, (req) => {
  const uid = req.user.id;
  const s = q.get(`SELECT
    (SELECT COUNT(*) FROM orders WHERE buyer_id = ? AND status = 'paid') orders,
    (SELECT COALESCE(SUM(total),0) FROM orders WHERE buyer_id = ? AND status = 'paid') spent,
    (SELECT COALESCE(SUM(discount),0) FROM orders WHERE buyer_id = ? AND status = 'paid') saved,
    (SELECT COUNT(*) FROM licenses WHERE user_id = ? AND status = 'active') licenses,
    (SELECT COUNT(*) FROM license_activations a JOIN licenses l ON l.id = a.license_id WHERE l.user_id = ?) activations,
    (SELECT COUNT(*) FROM wishlist WHERE user_id = ?) wishlist`, uid, uid, uid, uid, uid, uid);
  const recent = q.all(`SELECT number, total, status, created_at, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) items
    FROM orders o WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 5`, uid);
  const updates = q.all(`SELECT DISTINCT p.title, p.slug, v.version, v.changelog, v.created_at FROM product_versions v
    JOIN products p ON p.id = v.product_id JOIN licenses l ON l.product_id = p.id
    WHERE l.user_id = ? ORDER BY v.created_at DESC LIMIT 5`, uid);
  return { stats: s, recent_orders: recent, updates };
});

r.get('/api/me/library', auth, (req) => {
  return q.all(`SELECT p.id, p.title, p.slug, p.category, p.cover_url, p.version, p.updated_at, p.file_name, p.file_size, p.license_enabled,
      u.store_name, u.store_slug, l.id AS license_id, l.license_key, l.status AS license_status, l.max_activations, l.created_at AS acquired_at,
      (SELECT COUNT(*) FROM license_activations a WHERE a.license_id = l.id) AS activations,
      (SELECT rating FROM reviews WHERE product_id = p.id AND user_id = l.user_id) AS my_rating
    FROM licenses l JOIN products p ON p.id = l.product_id JOIN users u ON u.id = p.seller_id
    WHERE l.user_id = ? ORDER BY l.created_at DESC`, req.user.id).map((x) => ({ ...x, license_enabled: !!x.license_enabled }));
});

r.get('/api/me/orders', auth, (req) => {
  const orders = q.all(`SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 200`, req.user.id);
  const items = q.all(`SELECT oi.*, p.slug, p.cover_url FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.buyer_id = ?`, req.user.id);
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id).map(({ fee, net, ...i }) => i) }));
});

r.get('/api/me/orders/:number', auth, (req) => {
  const o = q.get('SELECT * FROM orders WHERE number = ? AND buyer_id = ?', req.params.number, req.user.id);
  if (!o) throw new HttpError(404, 'Nie znaleziono zamówienia');
  const items = q.all(`SELECT oi.title, oi.price, oi.discount, oi.product_id, p.slug, p.cover_url, l.license_key
    FROM order_items oi JOIN products p ON p.id = oi.product_id LEFT JOIN licenses l ON l.order_item_id = oi.id WHERE oi.order_id = ?`, o.id);
  return { ...o, items };
});

r.get('/api/me/licenses', auth, (req) => {
  const lic = q.all(`SELECT l.*, p.title, p.slug, p.cover_url FROM licenses l JOIN products p ON p.id = l.product_id
    WHERE l.user_id = ? ORDER BY l.created_at DESC`, req.user.id);
  const acts = q.all(`SELECT a.* FROM license_activations a JOIN licenses l ON l.id = a.license_id WHERE l.user_id = ?`, req.user.id);
  return lic.map((l) => ({ ...l, activations: acts.filter((a) => a.license_id === l.id) }));
});

r.post('/api/me/licenses/:id/reset', auth, (req) => {
  const l = q.get('SELECT * FROM licenses WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  if (!l) throw new HttpError(404, 'Nie znaleziono licencji');
  q.run('DELETE FROM license_activations WHERE license_id = ?', l.id);
  return { ok: true };
});

r.delete('/api/me/licenses/:id/activations/:aid', auth, (req) => {
  const l = q.get('SELECT * FROM licenses WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  if (!l) throw new HttpError(404, 'Nie znaleziono licencji');
  q.run('DELETE FROM license_activations WHERE id = ? AND license_id = ?', Number(req.params.aid), l.id);
  return { ok: true };
});

// Lista życzeń
r.get('/api/me/wishlist', auth, (req) => {
  const { PRODUCT_SELECT, publicProduct } = require('./store');
  return q.all(`${PRODUCT_SELECT} JOIN wishlist w ON w.product_id = p.id WHERE w.user_id = ? ORDER BY w.created_at DESC`, req.user.id).map(publicProduct);
});
r.post('/api/me/wishlist/:pid', auth, (req) => {
  q.run('INSERT OR IGNORE INTO wishlist(user_id, product_id, created_at) VALUES(?,?,?)', req.user.id, Number(req.params.pid), now());
  return { ok: true, wishlisted: true };
});
r.delete('/api/me/wishlist/:pid', auth, (req) => {
  q.run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', req.user.id, Number(req.params.pid));
  return { ok: true, wishlisted: false };
});

// Konto
r.patch('/api/me/profile', auth, async (req) => {
  const b = await readJson(req);
  const username = str(b.username ?? req.user.username, { name: 'Nazwa', min: 3, max: 32, required: true });
  const bio = str(b.bio ?? req.user.bio, { name: 'Opis', max: 500 });
  q.run('UPDATE users SET username = ?, bio = ? WHERE id = ?', username, bio, req.user.id);
  return { user: publicUser(q.get('SELECT * FROM users WHERE id = ?', req.user.id)) };
});

r.post('/api/me/password', auth, async (req) => {
  const b = await readJson(req);
  if (req.user.password_hash && !A.verifyPassword(String(b.current || ''), req.user.password_hash)) throw new HttpError(400, 'Obecne hasło jest nieprawidłowe');
  if (String(b.password || '').length < 8) throw new HttpError(400, 'Nowe hasło musi mieć min. 8 znaków');
  if (!req.user.email) {
    const email = String(b.email || '').trim().toLowerCase();
    if (!email) throw new HttpError(400, 'Podaj adres e-mail do logowania');
    if (q.get('SELECT id FROM users WHERE lower(email) = ?', email)) throw new HttpError(409, 'Ten e-mail jest zajęty');
    q.run('UPDATE users SET email = ? WHERE id = ?', email, req.user.id);
  }
  q.run('UPDATE users SET password_hash = ? WHERE id = ?', A.hashPassword(String(b.password)), req.user.id);
  return { ok: true };
});

r.post('/api/me/unlink/:provider', auth, (req) => {
  const col = { google: 'google_id', discord: 'discord_id' }[req.params.provider];
  if (!col) throw new HttpError(400, 'Nieznany dostawca');
  const u = req.user;
  const methods = [!!u.password_hash, !!u.google_id, !!u.discord_id].filter(Boolean).length;
  if (methods <= 1) throw new HttpError(400, 'Ustaw hasło lub połącz inne konto, zanim odłączysz ostatnią metodę logowania');
  q.run(`UPDATE users SET ${col} = NULL${col === 'discord_id' ? ', discord_username = NULL' : ''} WHERE id = ?`, u.id);
  return { ok: true };
});

r.put('/api/me/avatar', auth, async (req) => {
  const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[req.headers['content-type']];
  if (!ext) throw new HttpError(400, 'Dozwolone: PNG, JPG, WEBP, GIF');
  const name = `u${req.user.id}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  await streamToFile(req, path.join(env.PUBLIC_DIR, 'uploads', 'avatars', name), 2 * 1024 * 1024);
  const url = `/uploads/avatars/${name}`;
  q.run('UPDATE users SET avatar_url = ? WHERE id = ?', url, req.user.id);
  return { avatar_url: url };
});

r.post('/api/me/become-seller', auth, async (req) => {
  if (req.user.is_seller) return { ok: true };
  const b = await readJson(req);
  const name = str(b.store_name, { name: 'Nazwa sklepu', required: true, min: 3, max: 40 });
  A.makeSeller(req.user.id, name);
  return { user: publicUser(q.get('SELECT * FROM users WHERE id = ?', req.user.id)) };
});

module.exports = r;
