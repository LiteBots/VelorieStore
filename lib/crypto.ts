import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

function secret(name: string, min = 32): string {
  const v = process.env[name];
  if (!v || v.length < min) throw new Error(`Zmienna ${name} jest pusta lub za krótka (min. ${min} znaków).`);
  return v;
}

/* ---------- klucze licencji ---------- */
// Alfabet bez znaków łatwych do pomylenia (0/O, 1/I/L).
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateLicenseKey(): string {
  const block = () => Array.from({ length: 4 }, () => ALPHA[randomInt(ALPHA.length)]).join('');
  return `VLR-${block()}-${block()}-${block()}`;
}

export const LICENSE_RE = /^VLR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
export const normalizeKey = (k: string) => String(k || '').trim().toUpperCase();

/** HMAC-SHA256 z pieprzem — deterministyczny, więc można po nim wyszukiwać, ale bez pieprzu nie da się odwrócić. */
export function hashKey(key: string): string {
  return createHmac('sha256', secret('LICENSE_PEPPER')).update(normalizeKey(key)).digest('hex');
}

/* ---------- szyfrowanie AES-256-GCM ---------- */
function encKey(): Buffer {
  const hex = secret('ENCRYPTION_KEY', 64);
  const k = Buffer.from(hex, 'hex');
  if (k.length !== 32) throw new Error('ENCRYPTION_KEY musi mieć 64 znaki hex (32 bajty).');
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', encKey(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = String(payload).split('.');
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}

/* ---------- prywatność: IP i e-maile hashowane ---------- */
export function hashIp(ip: string): string {
  return createHmac('sha256', secret('LICENSE_PEPPER')).update('ip:' + ip).digest('hex').slice(0, 32);
}

export function sha256(v: string): string {
  return createHmac('sha256', secret('LICENSE_PEPPER')).update(v).digest('hex');
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

/* ---------- podpis odpowiedzi API licencji ---------- */
export function sign(body: string, ts: string): string {
  return createHmac('sha256', secret('LICENSE_SIGNING_SECRET')).update(`${ts}.${body}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
