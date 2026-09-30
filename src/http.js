// Mały framework HTTP: router, parsowanie body, cookies, pliki statyczne
const fs = require('fs');
const path = require('path');

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

class Router {
  constructor() { this.routes = []; }
  add(method, pattern, ...handlers) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '\\/?$');
    this.routes.push({ method, re, keys, handlers });
    return this;
  }
  get(p, ...h) { return this.add('GET', p, ...h); }
  post(p, ...h) { return this.add('POST', p, ...h); }
  put(p, ...h) { return this.add('PUT', p, ...h); }
  patch(p, ...h) { return this.add('PATCH', p, ...h); }
  delete(p, ...h) { return this.add('DELETE', p, ...h); }
  use(other) { this.routes.push(...other.routes); return this; }
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = pathname.match(r.re);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handlers: r.handlers, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) { try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); } }
  }
  return out;
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`, 'SameSite=Lax'];
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(prev) ? prev : prev ? [prev] : []), parts.join('; ')]);
}

function readRaw(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Zbyt duże żądanie')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  if (req._json !== undefined) return req._json;
  const raw = await readRaw(req);
  req._rawBody = raw;
  if (!raw.length) return (req._json = {});
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    return (req._json = Object.fromEntries(new URLSearchParams(raw.toString('utf8'))));
  }
  try { return (req._json = JSON.parse(raw.toString('utf8'))); }
  catch { throw new HttpError(400, 'Nieprawidłowy JSON'); }
}

// Zapis surowego body do pliku (upload strumieniowy)
function streamToFile(req, dest, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const tmp = dest + '.part';
    const out = fs.createWriteStream(tmp);
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        req.unpipe(out); out.destroy(); fs.rm(tmp, () => {});
        reject(new HttpError(413, `Plik przekracza limit ${Math.round(limit / 1024 / 1024)} MB`));
        req.resume();
      }
    });
    req.pipe(out);
    out.on('finish', () => {
      if (size === 0) { fs.rm(tmp, () => {}); return reject(new HttpError(400, 'Pusty plik')); }
      fs.rename(tmp, dest, (e) => (e ? reject(e) : resolve(size)));
    });
    out.on('error', reject);
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  const isObj = body !== null && typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(root, req, res, pathname, status = 200) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return false; }
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (stat.isDirectory()) return serveStatic(root, req, res, path.posix.join(pathname, 'index.html'), status);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

module.exports = { Router, HttpError, parseCookies, setCookie, readJson, readRaw, streamToFile, send, redirect, serveStatic, MIME };
