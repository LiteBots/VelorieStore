const crypto = require('crypto');
const { HttpError } = require('./http');
const { q } = require('./db');

const now = () => Date.now();

const CATEGORIES = [
  { id: 'minecraft-plugins', name: 'Pluginy Minecraft', icon: 'puzzle', group: 'Minecraft' },
  { id: 'minecraft-maps', name: 'Mapy Minecraft', icon: 'map', group: 'Minecraft' },
  { id: 'minecraft-builds', name: 'Budowle i spawny', icon: 'blocks', group: 'Minecraft' },
  { id: 'fivem-scripts', name: 'Skrypty FiveM', icon: 'file-code-2', group: 'FiveM' },
  { id: 'fivem-maps', name: 'Mapy FiveM (MLO)', icon: 'map-pinned', group: 'FiveM' },
  { id: 'fivem-interiors', name: 'Interiory FiveM', icon: 'house', group: 'FiveM' },
  { id: 'fivem-vehicles', name: 'Pojazdy FiveM', icon: 'car', group: 'FiveM' },
  { id: 'mods', name: 'Mody do gier', icon: 'gamepad-2', group: 'Inne' },
  { id: 'discord-bots', name: 'Boty i skrypty', icon: 'bot', group: 'Inne' },
  { id: 'graphics', name: 'Grafika i packi', icon: 'palette', group: 'Inne' },
  { id: 'web', name: 'Szablony WWW', icon: 'layout-template', group: 'Inne' },
  { id: 'other', name: 'Inne', icon: 'package', group: 'Inne' },
];
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

function slugify(s) {
  const map = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
  return String(s || '').toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => map[c])
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'item';
}

function uniqueSlug(table, column, base, excludeId) {
  let slug = slugify(base);
  let i = 1;
  while (q.get(`SELECT id FROM ${table} WHERE ${column} = ? AND id IS NOT ?`, slug, excludeId ?? null)) {
    slug = `${slugify(base)}-${++i}`;
  }
  return slug;
}

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function licenseKey() {
  const bytes = crypto.randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return `VEL-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

function orderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `VS-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Walidacja
function str(v, { min = 0, max = 5000, name = 'Pole', required = false } = {}) {
  const s = v === undefined || v === null ? '' : String(v).trim();
  if (required && !s) throw new HttpError(400, `${name} jest wymagane`);
  if (s && s.length < min) throw new HttpError(400, `${name}: minimum ${min} znaków`);
  if (s.length > max) throw new HttpError(400, `${name}: maksimum ${max} znaków`);
  return s;
}
function int(v, { min = -Infinity, max = Infinity, name = 'Wartość', def } = {}) {
  if ((v === undefined || v === '' || v === null) && def !== undefined) return def;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${name}: nieprawidłowa wartość`);
  return n;
}
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(e || ''));

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, email: u.email, username: u.username, avatar_url: u.avatar_url, bio: u.bio,
    is_seller: !!u.is_seller, is_admin: !!u.is_admin, store_name: u.store_name, store_slug: u.store_slug,
    has_password: !!u.password_hash, google: !!u.google_id, discord: !!u.discord_id, discord_username: u.discord_username,
    payout_method: u.payout_method, payout_details: u.payout_details, created_at: u.created_at,
  };
}

// Prosty limiter w pamięci
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const t = now();
  const b = buckets.get(key) || { n: 0, reset: t + windowMs };
  if (t > b.reset) { b.n = 0; b.reset = t + windowMs; }
  b.n++;
  buckets.set(key, b);
  if (b.n > max) throw new HttpError(429, 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.');
}
setInterval(() => { const t = now(); for (const [k, b] of buckets) if (t > b.reset) buckets.delete(k); }, 60_000).unref();

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function productRow(p) {
  if (!p) return p;
  let gallery = [];
  try { gallery = JSON.parse(p.gallery || '[]'); } catch {}
  return { ...p, gallery, tags: p.tags ? String(p.tags).split(',').map((t) => t.trim()).filter(Boolean) : [], license_enabled: !!p.license_enabled, featured: !!p.featured };
}

module.exports = { now, CATEGORIES, CATEGORY_IDS, slugify, uniqueSlug, licenseKey, orderNumber, str, int, isEmail, publicUser, rateLimit, clientIp, productRow };
