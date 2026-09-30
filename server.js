// Velorie Store — serwer (Node.js 22.13+, bez zależności npm)
const http = require('http');
const path = require('path');
const env = require('./src/env');
const { Router, HttpError, parseCookies, send, serveStatic } = require('./src/http');
const { loadUser } = require('./src/auth');

const router = new Router()
  .use(require('./src/routes/auth'))
  .use(require('./src/routes/store').router)
  .use(require('./src/routes/me'))
  .use(require('./src/routes/seller'))
  .use(require('./src/routes/admin'))
  .use(require('./src/routes/license-api'));

// Ładne adresy -> pliki HTML
const REWRITES = [
  [/^\/produkt\/([^/]+)\/?$/, '/produkt.html'],
  [/^\/tworca\/([^/]+)\/?$/, '/tworca.html'],
  [/^\/sklep\/?$/, '/sklep.html'],
  [/^\/koszyk\/?$/, '/koszyk.html'],
  [/^\/panel\/?$/, '/panel.html'],
  [/^\/logowanie\/?$/, '/auth.html'],
  [/^\/docs\/?$/, '/docs.html'],
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, env.BASE_URL);
  const pathname = url.pathname;
  req.query = Object.fromEntries(url.searchParams);
  req.cookies = parseCookies(req.headers.cookie);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  try {
    const isApi = pathname.startsWith('/api/') || pathname.startsWith('/auth/');
    if (isApi) {
      // Ochrona CSRF: żądania zmieniające stan muszą pochodzić z tej samej domeny
      const publicApi = pathname.startsWith('/api/v1/') || pathname.startsWith('/api/payments/');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !publicApi) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Niedozwolone źródło żądania');
      }
      if (publicApi) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return send(res, 204, '');
      }
      req.user = loadUser(req);
      const m = router.match(req.method, pathname);
      if (!m) throw new HttpError(404, 'Nie znaleziono');
      if (m.methodNotAllowed) throw new HttpError(405, 'Metoda niedozwolona');
      req.params = m.params;
      let result;
      for (const h of m.handlers) {
        result = await h(req, res);
        if (res.headersSent || res.writableEnded) return;
      }
      return send(res, 200, result === undefined ? { ok: true } : result);
    }

    for (const [re, file] of REWRITES) if (re.test(pathname)) return serveStatic(env.PUBLIC_DIR, req, res, file) || send(res, 404, 'Not found');
    if (serveStatic(env.PUBLIC_DIR, req, res, pathname)) return;
    if (!path.extname(pathname) && serveStatic(env.PUBLIC_DIR, req, res, pathname + '.html')) return;
    return serveStatic(env.PUBLIC_DIR, req, res, '/404.html', 404) || send(res, 404, 'Nie znaleziono');
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    send(res, status, { error: status >= 500 && !e.status ? 'Błąd serwera' : e.message, ...(e.extra || {}) });
  }
});

server.requestTimeout = 0; // duże uploady plików
server.listen(env.PORT, () => {
  console.log(`\n  Velorie Store działa: ${env.BASE_URL}`);
  console.log(`  Płatności: ${env.PAYMENT_PROVIDER} | prowizja: ${env.PLATFORM_FEE_PERCENT}%`);
  console.log(`  Google OAuth: ${env.GOOGLE_CLIENT_ID ? 'włączone' : 'wyłączone'} | Discord OAuth: ${env.DISCORD_CLIENT_ID ? 'włączone' : 'wyłączone'}\n`);
});
