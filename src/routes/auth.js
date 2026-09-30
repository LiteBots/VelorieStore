const { Router, HttpError, readJson } = require('../http');
const { q } = require('../db');
const A = require('../auth');
const { now, str, isEmail, publicUser, rateLimit, clientIp } = require('../util');

const r = new Router();

r.get('/api/auth/providers', () => A.providersStatus());

r.get('/api/auth/me', (req) => ({ user: publicUser(req.user) }));

r.post('/api/auth/register', async (req, res) => {
  rateLimit('reg:' + clientIp(req), 10, 10 * 60_000);
  const b = await readJson(req);
  const email = str(b.email, { name: 'E-mail', required: true, max: 190 }).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Nieprawidłowy adres e-mail');
  const username = str(b.username, { name: 'Nazwa użytkownika', required: true, min: 3, max: 32 });
  const password = String(b.password || '');
  if (password.length < 8) throw new HttpError(400, 'Hasło musi mieć co najmniej 8 znaków');
  if (q.get('SELECT id FROM users WHERE lower(email) = ?', email)) throw new HttpError(409, 'Konto z tym adresem już istnieje');
  const ins = q.run('INSERT INTO users(email, password_hash, username, created_at) VALUES(?,?,?,?)', email, A.hashPassword(password), username, now());
  const uid = Number(ins.lastInsertRowid);
  if (b.seller && b.store_name) A.makeSeller(uid, str(b.store_name, { name: 'Nazwa sklepu', min: 3, max: 40 }));
  A.createSession(res, uid);
  return { user: publicUser(q.get('SELECT * FROM users WHERE id = ?', uid)) };
});

r.post('/api/auth/login', async (req, res) => {
  rateLimit('login:' + clientIp(req), 15, 10 * 60_000);
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  const u = q.get('SELECT * FROM users WHERE lower(email) = ?', email);
  if (!u || !A.verifyPassword(String(b.password || ''), u.password_hash)) throw new HttpError(401, 'Nieprawidłowy e-mail lub hasło');
  if (u.banned) throw new HttpError(403, 'Konto zostało zablokowane');
  A.createSession(res, u.id);
  return { user: publicUser(u) };
});

r.post('/api/auth/logout', (req, res) => { A.destroySession(req, res); return { ok: true }; });

// OAuth
r.get('/auth/google', A.oauthStart('google'));
r.get('/auth/google/callback', A.oauthCallback('google'));
r.get('/auth/discord', A.oauthStart('discord'));
r.get('/auth/discord/callback', A.oauthCallback('discord'));

module.exports = r;
