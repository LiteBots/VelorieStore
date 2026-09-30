// Publiczne API licencji — wywoływane przez pluginy / skrypty kupujących.
//   POST /api/v1/licenses/verify      { license_key, product_id?, identifier }
//   POST /api/v1/licenses/deactivate  { license_key, identifier }
// Odpowiedź zawsze 200 z polem "valid" (łatwiej obsłużyć w Lua/Java), 429 przy nadużyciach.
const { Router, readJson } = require('../http');
const { q } = require('../db');
const { now, rateLimit, clientIp } = require('../util');

const r = new Router();

async function input(req) {
  const b = req.method === 'GET' ? req.query : await readJson(req);
  return {
    key: String(b.license_key || b.key || '').trim().toUpperCase(),
    productId: b.product_id ? Number(b.product_id) : null,
    identifier: String(b.identifier || b.server_id || b.hwid || '').trim().slice(0, 128) || clientIp(req),
  };
}

async function verify(req) {
  rateLimit('lic:' + clientIp(req), 120, 60_000);
  const { key, productId, identifier } = await input(req);
  if (!key) return { valid: false, reason: 'missing_key', message: 'Brak klucza licencji' };
  const l = q.get(`SELECT l.*, p.title, p.version, p.license_enabled, p.id pid, u.username FROM licenses l
    JOIN products p ON p.id = l.product_id JOIN users u ON u.id = l.user_id WHERE l.license_key = ?`, key);
  if (!l) return { valid: false, reason: 'not_found', message: 'Licencja nie istnieje' };
  if (productId && productId !== l.pid) return { valid: false, reason: 'wrong_product', message: 'Klucz dotyczy innego produktu' };
  if (l.status !== 'active') return { valid: false, reason: 'revoked', message: 'Licencja została unieważniona' };

  const t = now();
  const existing = q.get('SELECT * FROM license_activations WHERE license_id = ? AND identifier = ?', l.id, identifier);
  const count = q.get('SELECT COUNT(*) n FROM license_activations WHERE license_id = ?', l.id).n;
  if (existing) {
    q.run('UPDATE license_activations SET last_seen = ?, ip = ? WHERE id = ?', t, clientIp(req), existing.id);
  } else if (l.max_activations > 0 && count >= l.max_activations) {
    return { valid: false, reason: 'activation_limit', message: `Osiągnięto limit aktywacji (${l.max_activations}). Zresetuj aktywacje w panelu Velorie.` };
  } else {
    q.run('INSERT INTO license_activations(license_id, identifier, ip, first_seen, last_seen) VALUES(?,?,?,?,?)', l.id, identifier, clientIp(req), t, t);
  }
  return {
    valid: true,
    license: {
      product_id: l.pid, product: l.title, latest_version: l.version, owner: l.username,
      activations: existing ? count : count + 1, max_activations: l.max_activations, identifier,
    },
  };
}

r.post('/api/v1/licenses/verify', verify);
r.get('/api/v1/licenses/verify', verify);

r.post('/api/v1/licenses/deactivate', async (req) => {
  rateLimit('lic:' + clientIp(req), 120, 60_000);
  const { key, identifier } = await input(req);
  const l = q.get('SELECT id FROM licenses WHERE license_key = ?', key);
  if (!l) return { ok: false, reason: 'not_found' };
  q.run('DELETE FROM license_activations WHERE license_id = ? AND identifier = ?', l.id, identifier);
  return { ok: true };
});

module.exports = r;
