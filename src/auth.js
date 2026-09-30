// Uwierzytelnianie: hasła (scrypt), sesje w SQLite, OAuth Google i Discord
const crypto = require('crypto');
const env = require('./env');
const { q } = require('./db');
const { HttpError, setCookie, redirect } = require('./http');
const { now, uniqueSlug } = require('./util');

const SESSION_COOKIE = 'vs_session';
const SESSION_TTL = 30 * 24 * 3600 * 1000;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(pw, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  q.run('INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?,?,?,?)', token, userId, now() + SESSION_TTL, now());
  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL / 1000, secure: env.SECURE_COOKIES });
}
function destroySession(req, res) {
  const t = req.cookies[SESSION_COOKIE];
  if (t) q.run('DELETE FROM sessions WHERE token = ?', t);
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0, secure: env.SECURE_COOKIES });
}
function loadUser(req) {
  const t = req.cookies[SESSION_COOKIE];
  if (!t) return null;
  const u = q.get(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`, t, now());
  if (!u || u.banned) return null;
  return u;
}
setInterval(() => q.run('DELETE FROM sessions WHERE expires_at < ?', now()), 3600_000).unref();

// Middleware
const requireAuth = (req) => { if (!req.user) throw new HttpError(401, 'Musisz być zalogowany'); };
const requireSeller = (req) => { requireAuth(req); if (!req.user.is_seller) throw new HttpError(403, 'Dostępne tylko dla twórców'); };
const requireAdmin = (req) => { requireAuth(req); if (!req.user.is_admin) throw new HttpError(403, 'Brak uprawnień'); };

// ---------- OAuth ----------
const PROVIDERS = {
  google: {
    enabled: () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    authorizeUrl: (state) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${env.BASE_URL}/auth/google/callback`, response_type: 'code',
      scope: 'openid email profile', state, prompt: 'select_account',
    }),
    async profile(code) {
      const tok = await postForm('https://oauth2.googleapis.com/token', {
        code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.BASE_URL}/auth/google/callback`, grant_type: 'authorization_code',
      });
      const u = await getJson('https://openidconnect.googleapis.com/v1/userinfo', tok.access_token);
      return { id: u.sub, email: u.email_verified ? u.email : null, username: u.name || (u.email || '').split('@')[0], avatar: u.picture };
    },
  },
  discord: {
    enabled: () => !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
    authorizeUrl: (state) => 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID, redirect_uri: `${env.BASE_URL}/auth/discord/callback`, response_type: 'code',
      scope: 'identify email', state, prompt: 'none',
    }),
    async profile(code) {
      const tok = await postForm('https://discord.com/api/oauth2/token', {
        code, client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET,
        redirect_uri: `${env.BASE_URL}/auth/discord/callback`, grant_type: 'authorization_code',
      });
      const u = await getJson('https://discord.com/api/users/@me', tok.access_token);
      return {
        id: u.id, email: u.verified ? u.email : null, username: u.global_name || u.username, handle: u.username,
        avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256` : null,
      };
    },
  },
};

async function postForm(url, data) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('OAuth token error: ' + (j.error_description || j.error || r.status));
  return j;
}
async function getJson(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('OAuth profile error: ' + r.status);
  return r.json();
}

function oauthStart(provider) {
  return (req, res) => {
    const p = PROVIDERS[provider];
    if (!p.enabled()) return redirect(res, `/auth.html?error=${encodeURIComponent(`Logowanie przez ${provider} nie jest skonfigurowane`)}`);
    const state = crypto.randomBytes(16).toString('hex');
    const next = /^\/[^/]/.test(req.query.next || '') ? req.query.next : '/panel.html';
    setCookie(res, 'vs_oauth', JSON.stringify({ state, next, link: req.query.link === '1' }), { maxAge: 600, secure: env.SECURE_COOKIES });
    redirect(res, p.authorizeUrl(state));
  };
}

function oauthCallback(provider) {
  const col = provider === 'google' ? 'google_id' : 'discord_id';
  return async (req, res) => {
    let saved = {};
    try { saved = JSON.parse(req.cookies.vs_oauth || '{}'); } catch {}
    setCookie(res, 'vs_oauth', '', { maxAge: 0 });
    const fail = (msg) => redirect(res, `/auth.html?error=${encodeURIComponent(msg)}`);
    if (!req.query.code || !saved.state || saved.state !== req.query.state) return fail('Sesja logowania wygasła. Spróbuj ponownie.');
    let prof;
    try { prof = await PROVIDERS[provider].profile(req.query.code); }
    catch (e) { console.error(e); return fail('Nie udało się zalogować przez ' + provider); }

    const extra = provider === 'discord' ? { discord_username: prof.handle } : {};
    let user = q.get(`SELECT * FROM users WHERE ${col} = ?`, prof.id);

    if (req.user && saved.link) {
      // Podpinanie konta do zalogowanego użytkownika
      if (user && user.id !== req.user.id) return redirect(res, `/panel.html#/account/settings?error=${encodeURIComponent('To konto jest już połączone z innym użytkownikiem')}`);
      q.run(`UPDATE users SET ${col} = ?, discord_username = COALESCE(?, discord_username) WHERE id = ?`, prof.id, extra.discord_username || null, req.user.id);
      return redirect(res, '/panel.html#/account/settings');
    }

    if (!user && prof.email) {
      user = q.get('SELECT * FROM users WHERE lower(email) = lower(?)', prof.email);
      if (user) q.run(`UPDATE users SET ${col} = ?, discord_username = COALESCE(?, discord_username), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`, prof.id, extra.discord_username || null, prof.avatar, user.id);
    }
    if (!user) {
      const r = q.run(
        `INSERT INTO users(email, username, avatar_url, ${col}, discord_username, created_at) VALUES(?,?,?,?,?,?)`,
        prof.email, (prof.username || 'Gracz').slice(0, 32), prof.avatar, prof.id, extra.discord_username || null, now(),
      );
      user = q.get('SELECT * FROM users WHERE id = ?', r.lastInsertRowid);
    }
    if (user.banned) return fail('Konto zostało zablokowane');
    createSession(res, user.id);
    redirect(res, saved.next || '/panel.html');
  };
}

function providersStatus() {
  return { google: PROVIDERS.google.enabled(), discord: PROVIDERS.discord.enabled() };
}

function makeSeller(userId, storeName) {
  const slug = uniqueSlug('users', 'store_slug', storeName);
  q.run('UPDATE users SET is_seller = 1, store_name = ?, store_slug = ? WHERE id = ?', storeName, slug, userId);
}

module.exports = {
  hashPassword, verifyPassword, createSession, destroySession, loadUser,
  requireAuth, requireSeller, requireAdmin, oauthStart, oauthCallback, providersStatus, makeSeller,
};
