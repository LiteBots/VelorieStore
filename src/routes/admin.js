// Administracja platformy
const { Router, HttpError, readJson } = require('../http');
const { q, setSetting, getSetting } = require('../db');
const A = require('../auth');
const { now, str } = require('../util');

const r = new Router();
const admin = A.requireAdmin;

r.get('/api/admin/overview', admin, () => q.get(`SELECT
  (SELECT COUNT(*) FROM users) users,
  (SELECT COUNT(*) FROM users WHERE is_seller = 1) sellers,
  (SELECT COUNT(*) FROM products) products,
  (SELECT COUNT(*) FROM products WHERE status = 'published') published,
  (SELECT COUNT(*) FROM orders WHERE status = 'paid') orders,
  (SELECT COALESCE(SUM(total),0) FROM orders WHERE status = 'paid') gmv,
  (SELECT COALESCE(SUM(oi.fee),0) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status = 'paid') fees,
  (SELECT COUNT(*) FROM payouts WHERE status = 'pending') pending_payouts,
  (SELECT COALESCE(SUM(amount),0) FROM payouts WHERE status = 'pending') pending_payouts_amount`));

r.get('/api/admin/products', admin, (req) => {
  const s = `%${req.query.q || ''}%`;
  return q.all(`SELECT p.id, p.title, p.slug, p.category, p.price, p.status, p.featured, p.created_at, u.store_name,
    (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) sales
    FROM products p JOIN users u ON u.id = p.seller_id WHERE p.title LIKE ? OR u.store_name LIKE ? ORDER BY p.created_at DESC LIMIT 300`, s, s);
});

r.patch('/api/admin/products/:id', admin, async (req) => {
  const b = await readJson(req);
  const p = q.get('SELECT * FROM products WHERE id = ?', Number(req.params.id));
  if (!p) throw new HttpError(404, 'Brak produktu');
  const status = b.status !== undefined ? String(b.status) : p.status;
  if (!['draft', 'published', 'blocked'].includes(status)) throw new HttpError(400, 'Zły status');
  q.run('UPDATE products SET status = ?, featured = ? WHERE id = ?', status, b.featured !== undefined ? (b.featured ? 1 : 0) : p.featured, p.id);
  return { ok: true };
});

r.get('/api/admin/users', admin, (req) => {
  const s = `%${req.query.q || ''}%`;
  return q.all(`SELECT id, email, username, is_seller, is_admin, banned, store_name, created_at, google_id IS NOT NULL google, discord_id IS NOT NULL discord,
    (SELECT COUNT(*) FROM orders WHERE buyer_id = users.id AND status = 'paid') orders
    FROM users WHERE email LIKE ? OR username LIKE ? ORDER BY created_at DESC LIMIT 300`, s, s);
});

r.patch('/api/admin/users/:id', admin, async (req) => {
  const b = await readJson(req);
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'Nie możesz zmienić własnych uprawnień');
  const u = q.get('SELECT * FROM users WHERE id = ?', id);
  if (!u) throw new HttpError(404, 'Brak użytkownika');
  q.run('UPDATE users SET banned = ?, is_admin = ? WHERE id = ?', b.banned !== undefined ? (b.banned ? 1 : 0) : u.banned, b.is_admin !== undefined ? (b.is_admin ? 1 : 0) : u.is_admin, id);
  if (b.banned) q.run('DELETE FROM sessions WHERE user_id = ?', id);
  return { ok: true };
});

r.get('/api/admin/payouts', admin, () => q.all(`SELECT py.*, u.store_name, u.email FROM payouts py JOIN users u ON u.id = py.seller_id ORDER BY py.status = 'pending' DESC, py.created_at DESC LIMIT 300`));

r.patch('/api/admin/payouts/:id', admin, async (req) => {
  const b = await readJson(req);
  if (!['paid', 'rejected', 'pending'].includes(b.status)) throw new HttpError(400, 'Zły status');
  q.run('UPDATE payouts SET status = ?, processed_at = ? WHERE id = ?', b.status, b.status === 'pending' ? null : now(), Number(req.params.id));
  return { ok: true };
});

r.get('/api/admin/infobar', admin, () => getSetting('infobar', { isActive: false }));
r.put('/api/admin/infobar', admin, async (req) => {
  const b = await readJson(req);
  const val = {
    isActive: !!b.isActive,
    text: str(b.text, { max: 200 }),
    bgColor: /^#[0-9a-f]{6}$/i.test(b.bgColor) ? b.bgColor : '#ff0354',
    textColor: /^#[0-9a-f]{6}$/i.test(b.textColor) ? b.textColor : '#ffffff',
    linkUrl: /^https?:\/\//.test(b.linkUrl || '') || /^\//.test(b.linkUrl || '') ? String(b.linkUrl).slice(0, 300) : '',
    linkText: str(b.linkText, { max: 40 }),
  };
  setSetting('infobar', val);
  return val;
});

module.exports = r;
