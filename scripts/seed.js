// Dane demonstracyjne: node scripts/seed.js  (czyści bazę!)
const fs = require('fs');
const path = require('path');
const env = require('../src/env');

for (const f of [env.DB_FILE, env.DB_FILE + '-wal', env.DB_FILE + '-shm']) fs.rmSync(f, { force: true });
const { q, tx } = require('../src/db');
const { hashPassword } = require('../src/auth');
const { slugify, licenseKey, orderNumber } = require('../src/util');

const DAY = 86400_000;
const T = Date.now();
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

function user(email, username, extra = {}) {
  const r = q.run(`INSERT INTO users(email, password_hash, username, bio, is_seller, is_admin, store_name, store_slug, payout_method, payout_details, created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`, email, hashPassword('demo1234'), username, extra.bio || '', extra.store ? 1 : 0, extra.admin ? 1 : 0,
  extra.store || null, extra.store ? slugify(extra.store) : null, extra.store ? 'bank' : null, extra.store ? 'PL61 1090 1014 0000 0712 1981 2874' : null, T - 200 * DAY);
  return Number(r.lastInsertRowid);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Ikony z frontendu (ten sam zestaw co w sklepie)
const iconCtx = { window: {} };
require('vm').runInNewContext(fs.readFileSync(path.join(env.PUBLIC_DIR, 'assets/js/icons.js'), 'utf8'), iconCtx);
const iconSvg = (name) => iconCtx.window.VSIcons.icon(name).replace(/^<svg[^>]*>|<\/svg>$/g, '');
const CAT_ICON = { 'fivem-scripts': 'file-code', 'fivem-interiors': 'house', 'fivem-maps': 'pin', 'minecraft-builds': 'blocks', 'minecraft-maps': 'map', 'minecraft-plugins': 'plug', mods: 'gamepad', 'discord-bots': 'bot', graphics: 'palette' };

function cover(slug, title, label, c1, c2, cat, compat) {
  const words = title.split(' ');
  const lines = [];
  for (const w of words) { if (lines.length && (lines[lines.length - 1] + ' ' + w).length <= 15) lines[lines.length - 1] += ' ' + w; else lines.push(w); }
  const W = 1280, H = 800;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="a" cx="0.82" cy="0.18" r="0.75"><stop offset="0" stop-color="${c1}" stop-opacity=".75"/><stop offset=".55" stop-color="${c1}" stop-opacity=".12"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient>
  <radialGradient id="b" cx="0.05" cy="1.05" r="0.7"><stop offset="0" stop-color="${c2}" stop-opacity=".6"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>
  <radialGradient id="m" cx=".75" cy=".45" r=".6"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="gm"><rect width="${W}" height="${H}" fill="url(#m)"/></mask>
  <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity=".07"/></pattern>
  <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></linearGradient>
  <linearGradient id="tb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#08090f"/>
<rect width="${W}" height="${H}" fill="url(#a)"/><rect width="${W}" height="${H}" fill="url(#b)"/>
<rect width="${W}" height="${H}" fill="url(#g)" mask="url(#gm)"/>
<g transform="translate(830 170)">
  <rect x="-40" y="-40" width="420" height="420" rx="100" fill="none" stroke="#fff" stroke-opacity=".06"/>
  <rect x="-90" y="-90" width="520" height="520" rx="130" fill="none" stroke="#fff" stroke-opacity=".035"/>
  <rect width="340" height="340" rx="84" fill="url(#t)" stroke="url(#tb)" stroke-width="2"/>
  <g transform="translate(70 70) scale(8.33)" fill="none" stroke="#fff" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${iconSvg(CAT_ICON[cat] || 'package')}</g>
</g>
<g font-family="Inter, 'SF Pro Display', 'Segoe UI', Arial, sans-serif">
  <rect x="80" y="${H - 190 - lines.length * 92 - 70}" width="${label.length * 17 + 52}" height="48" rx="24" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".18"/>
  <text x="106" y="${H - 190 - lines.length * 92 - 38}" font-size="21" font-weight="600" letter-spacing="2" fill="#fff" fill-opacity=".9">${esc(label.toUpperCase())}</text>
  ${lines.slice(0, 3).map((l, i) => `<text x="76" y="${H - 190 - (lines.length - 1 - i) * 92}" font-size="88" font-weight="700" letter-spacing="-3.5" fill="#fff">${esc(l)}</text>`).join('')}
  <text x="80" y="${H - 120}" font-size="32" fill="#fff" fill-opacity=".6">${esc(compat)}</text>
</g>
</svg>`;
  fs.writeFileSync(path.join(env.PUBLIC_DIR, 'uploads', 'covers', `seed-${slug}.svg`), svg);
  return `/uploads/covers/seed-${slug}.svg`;
}

tx(() => {
  const admin = user('admin@velorie.store', 'Admin', { admin: true });
  const nova = user('nova@velorie.store', 'NovaDev', { store: 'NovaDev Scripts', bio: 'Skrypty FiveM pod ESX i QBCore. Optymalizacja 0.00ms idle, wsparcie na Discordzie.' });
  const pixel = user('pixel@velorie.store', 'PixelBuild', { store: 'PixelBuild Studio', bio: 'Zespół budowniczych Minecraft: spawny, huby, lobby i mapy minigier.' });
  const kreator = user('kreator@velorie.store', 'Kreator', { store: 'Kreator Mods', bio: 'Pluginy Spigot/Paper, mody Fabric i interiory MLO.' });
  const buyers = [user('gracz@velorie.store', 'GraczDemo')];
  for (const n of ['Kuba_RP', 'Ola.mc', 'xSzymon', 'Wiktor', 'MajaBuilds', 'Paweł', 'Lena', 'Tomek99', 'Nikoś', 'Bartek']) buyers.push(user(`${slugify(n)}@example.com`, n));

  const P = [
    [nova, 'Advanced Garage System', 'fivem-scripts', 8900, 'Garaże, holowanie i impound z UI w React.', 'ESX • QBCore', ['garaż', 'esx', 'qbcore'], '#ff0354', '#7c3aed', 1, 2],
    [nova, 'Realistic Police Job', 'fivem-scripts', 14900, 'Kompletna praca policji: MDT, kajdanki, radar, dowody.', 'QBCore • ox_lib', ['policja', 'mdt', 'rp'], '#1d4ed8', '#7c3aed', 1, 2],
    [nova, 'Phone UI Lite', 'fivem-scripts', 0, 'Darmowy, lekki telefon z aplikacjami i wiadomościami.', 'Standalone', ['telefon', 'free'], '#0ea5e9', '#22c55e', 0, 0],
    [kreator, 'Mechanic Workshop MLO', 'fivem-interiors', 6900, 'Warsztat z podnośnikami, biurem i lakiernią.', 'GTA V b2944+', ['mlo', 'warsztat'], '#f97316', '#ff0354', 0, 1],
    [kreator, 'Luxury Penthouse Interior', 'fivem-interiors', 4900, 'Apartament na dachu z basenem i widokiem na miasto.', 'GTA V b2699+', ['apartament', 'mlo'], '#7c3aed', '#ec4899', 0, 1],
    [nova, 'Sandy Shores Rework', 'fivem-maps', 11900, 'Przebudowa Sandy Shores: nowy posterunek, szpital, sklepy.', 'GTA V b2802+', ['mapa', 'sandy'], '#eab308', '#f97316', 1, 1],
    [pixel, 'Medieval Spawn 250x250', 'minecraft-builds', 7900, 'Średniowieczny spawn z zamkiem, portalami i NPC spotami.', 'Java 1.16–1.21', ['spawn', 'medieval'], '#16a34a', '#0ea5e9', 1, 0],
    [pixel, 'Skyblock Lobby Pack', 'minecraft-builds', 5900, 'Zestaw 3 lobby dla serwerów Skyblock i OneBlock.', 'Java 1.20+', ['lobby', 'skyblock'], '#06b6d4', '#7c3aed', 0, 0],
    [pixel, 'BedWars Arena Collection', 'minecraft-maps', 9900, '8 aren BedWars 4x4 i 8x2 gotowych do BungeeCord.', 'Java 1.8–1.21', ['bedwars', 'minigry'], '#ef4444', '#f59e0b', 0, 0],
    [kreator, 'EliteEconomy Pro', 'minecraft-plugins', 5900, 'Ekonomia, sklep GUI, aukcje i bank z MySQL.', 'Paper 1.20–1.21', ['ekonomia', 'gui', 'mysql'], '#22c55e', '#0ea5e9', 1, 1],
    [kreator, 'AntiCheat Guardian', 'minecraft-plugins', 12900, 'Lekki anticheat z panelem webowym i alertami na Discordzie.', 'Paper/Spigot 1.8–1.21', ['anticheat', 'bezpieczeństwo'], '#111827', '#ff0354', 0, 3],
    [kreator, 'Fabric Performance Pack', 'mods', 2900, 'Zestaw modów FPS + konfiguracja pod słabsze PC.', 'Fabric 1.21', ['fps', 'fabric'], '#8b5cf6', '#06b6d4', 0, 0],
    [pixel, 'Discord Ticket Bot', 'discord-bots', 3900, 'Bot ticketów z transkrypcjami i panelem uprawnień.', 'Node.js 20+', ['discord', 'bot'], '#5865f2', '#7c3aed', 0, 1],
    [nova, 'Server Branding Pack', 'graphics', 2400, 'Logo, banery i ikony dla serwera RP — pliki PSD i PNG.', 'PSD • PNG • SVG', ['grafika', 'branding'], '#ff0354', '#f59e0b', 0, 0],
  ];

  const products = [];
  for (const [sid, title, cat, price, summary, compat, tags, c1, c2, featured, maxAct] of P) {
    const slug = slugify(title);
    const label = { 'fivem-scripts': 'FiveM Script', 'fivem-interiors': 'FiveM Interior', 'fivem-maps': 'FiveM Map', 'minecraft-builds': 'Minecraft Build', 'minecraft-maps': 'Minecraft Map', 'minecraft-plugins': 'Minecraft Plugin', mods: 'Mod', 'discord-bots': 'Discord Bot', graphics: 'Graphics' }[cat];
    const created = T - Math.floor(30 + rnd() * 120) * DAY;
    const fileName = `${slug}.zip`;
    const stored = `seed-${slug}.zip`;
    fs.writeFileSync(path.join(env.FILES_DIR, stored), `To jest plik demonstracyjny produktu „${title}”.\nW prawdziwym sklepie twórca wgrywa tu archiwum ZIP.\n`);
    const desc = `${summary} Produkt jest aktywnie rozwijany, a wszystkie aktualizacje otrzymujesz bez dodatkowych opłat.\n\n## Funkcje\n- Pełna konfiguracja w pliku config\n- Tłumaczenia PL / EN\n- Zoptymalizowany kod i regularne aktualizacje\n- Wsparcie twórcy na Discordzie\n\n## Instalacja\n1. Pobierz archiwum z biblioteki Velorie\n2. Wgraj do folderu resources / plugins\n3. Wpisz klucz licencji w config i uruchom serwer`;
    const r = q.run(`INSERT INTO products(seller_id, title, slug, summary, description, category, price, tags, version, compatibility, cover_url, file_path, file_name, file_size, license_enabled, max_activations, status, featured, views, created_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, sid, title, slug, summary, desc, cat, price, tags.join(','), '1.2.0', compat,
    cover(slug, title, label, c1, c2, cat, compat), stored, fileName, 180, maxAct > 0 ? 1 : 0, maxAct, 'published', featured, Math.floor(200 + rnd() * 2400), created, created + 10 * DAY);
    const pid = Number(r.lastInsertRowid);
    q.run('INSERT INTO product_versions(product_id, version, changelog, created_at) VALUES(?,?,?,?)', pid, '1.0.0', 'Pierwsze wydanie', created);
    q.run('INSERT INTO product_versions(product_id, version, changelog, created_at) VALUES(?,?,?,?)', pid, '1.2.0', '- Poprawki wydajności\n- Nowe opcje w configu\n- Tłumaczenie EN', created + 10 * DAY);
    products.push({ id: pid, sid, price, title, maxAct, created });
  }

  q.run(`INSERT INTO coupons(seller_id, code, percent, max_uses, created_at) VALUES(?,?,?,?,?)`, nova, 'START20', 20, 500, T);
  q.run(`INSERT INTO coupons(seller_id, code, percent, max_uses, created_at) VALUES(?,?,?,?,?)`, kreator, 'VELORIE10', 10, null, T);

  // Zamówienia z ostatnich 90 dni
  const comments = ['Działa idealnie, polecam!', 'Świetny support, szybka pomoc.', 'Dobra jakość, drobne błędy poprawione w aktualizacji.', 'Warte swojej ceny.', 'Super wygląd, gracze zachwyceni.', 'Mogłoby mieć więcej opcji w configu.'];
  const owned = new Set();
  for (let i = 0; i < 170; i++) {
    const buyer = pick(buyers);
    const prod = pick(products);
    if (owned.has(`${buyer}:${prod.id}`)) continue;
    const at = Math.max(prod.created, T - Math.floor(rnd() * rnd() * 90 * DAY) - Math.floor(rnd() * DAY));
    const discount = prod.price && rnd() < 0.15 ? Math.round(prod.price * 0.2) : 0;
    const paid = prod.price - discount;
    const fee = Math.round(paid * env.PLATFORM_FEE_PERCENT / 100);
    const o = q.run(`INSERT INTO orders(number, buyer_id, subtotal, discount, total, status, provider, coupon_code, created_at, paid_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      orderNumber() + i, buyer, prod.price, discount, paid, 'paid', 'demo', discount ? 'START20' : null, at, at);
    const oi = q.run('INSERT INTO order_items(order_id, product_id, seller_id, title, price, discount, fee, net) VALUES(?,?,?,?,?,?,?,?)', o.lastInsertRowid, prod.id, prod.sid, prod.title, prod.price, discount, fee, paid - fee);
    const lic = q.run('INSERT INTO licenses(license_key, product_id, user_id, order_item_id, max_activations, created_at) VALUES(?,?,?,?,?,?)', licenseKey(), prod.id, buyer, oi.lastInsertRowid, prod.maxAct, at);
    if (prod.maxAct && rnd() < 0.7) q.run('INSERT INTO license_activations(license_id, identifier, ip, first_seen, last_seen) VALUES(?,?,?,?,?)', lic.lastInsertRowid, `srv-${Math.floor(rnd() * 9999)}`, '127.0.0.1', at, T - Math.floor(rnd() * 10 * DAY));
    owned.add(`${buyer}:${prod.id}`);
    if (rnd() < 0.45) q.run('INSERT OR IGNORE INTO reviews(product_id, user_id, rating, comment, created_at) VALUES(?,?,?,?,?)', prod.id, buyer, pick([5, 5, 5, 4, 4, 3]), pick(comments), at + DAY);
  }
  q.run(`INSERT INTO payouts(seller_id, amount, method, details, status, created_at, processed_at) VALUES(?,?,?,?,?,?,?)`, nova, 50000, 'bank', 'PL61…2874', 'paid', T - 20 * DAY, T - 18 * DAY);
  q.run(`INSERT INTO wishlist(user_id, product_id, created_at) VALUES(?,?,?)`, buyers[0], products[1].id, T);
  q.run(`INSERT INTO settings(key, value) VALUES('infobar', ?)`, JSON.stringify({ isActive: true, text: 'Velorie Store wystartował! Kod START20 = -20% na skrypty NovaDev.', bgColor: '#ff0354', textColor: '#ffffff', linkUrl: '/sklep.html?category=fivem-scripts', linkText: 'Zobacz' }));
  void admin;
});

console.log(`Gotowe. Konta demo (hasło: demo1234):
  admin@velorie.store   — administrator
  nova@velorie.store    — twórca (NovaDev Scripts)
  pixel@velorie.store   — twórca (PixelBuild Studio)
  kreator@velorie.store — twórca (Kreator Mods)
  gracz@velorie.store   — kupujący`);
