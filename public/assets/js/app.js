/* Velorie Store — wspólny skrypt frontendu */
(function () {
  const LOGO = 'https://i.imgur.com/NDhlWyz.png';
  const { icon, hydrate } = window.VSIcons;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = {
    price(v, freeLabel = 'Za darmo') {
      if (!v) return freeLabel;
      return (v / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
    },
    money(v) { return ((v || 0) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'; },
    compactMoney(v) {
      const z = (v || 0) / 100;
      if (z >= 10000) return (z / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' tys. zł';
      return z.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' zł';
    },
    date(t) { return t ? new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; },
    datetime(t) { return t ? new Date(t).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; },
    rel(t) {
      if (!t) return '—';
      const s = (Date.now() - t) / 1000;
      if (s < 60) return 'przed chwilą';
      if (s < 3600) return `${Math.floor(s / 60)} min temu`;
      if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
      const d = Math.floor(s / 86400);
      if (d === 1) return 'wczoraj';
      if (d < 30) return `${d} dni temu`;
      return fmt.date(t);
    },
    size(b) {
      if (!b) return '—';
      const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
      while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
      return `${b.toFixed(i ? 1 : 0).replace('.', ',')} ${u[i]}`;
    },
    num(n) { return Number(n || 0).toLocaleString('pl-PL'); },
    plural(n, one, few, many) {
      const m10 = n % 10, m100 = n % 100;
      if (n === 1) return one;
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
      return many;
    },
  };

  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { ...(opts.headers || {}) }, credentials: 'same-origin' };
    if (opts.raw) init.body = opts.raw;
    else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
    const res = await fetch(path, init);
    let data = null;
    if ((res.headers.get('content-type') || '').includes('json')) data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error) || `Błąd ${res.status}`);
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }

  function upload(path, file, { method = 'PUT', onProgress } = {}) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open(method, path);
      x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      x.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(Math.round((e.loaded / e.total) * 100));
      x.onload = () => {
        let d = null; try { d = JSON.parse(x.responseText); } catch {}
        x.status < 300 ? resolve(d) : reject(new Error((d && d.error) || 'Błąd wysyłania'));
      };
      x.onerror = () => reject(new Error('Błąd sieci'));
      x.send(file);
    });
  }

  // ---------- Koszyk ----------
  const CART_KEY = 'vs_cart';
  const cart = {
    items() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } },
    save(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {} document.dispatchEvent(new CustomEvent('cart:change')); },
    has(id) { return cart.items().some((i) => i.id === id); },
    add(p, silent) {
      if (cart.has(p.id)) return;
      cart.save([...cart.items(), { id: p.id, title: p.title, price: p.price, cover_url: p.cover_url, slug: p.slug, store_name: p.store_name }]);
      if (!silent) toast(`Dodano do koszyka · ${p.title}`, 'ok', { href: '/koszyk.html', label: 'Koszyk' });
    },
    remove(id) { cart.save(cart.items().filter((i) => i.id !== id)); },
    clear() { cart.save([]); },
    count() { return cart.items().length; },
  };

  // ---------- Toasty i modale ----------
  function toast(msg, tone = 'info', action) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = `toast ${tone}`;
    t.innerHTML = `${icon(tone === 'ok' ? 'check-circle' : tone === 'err' ? 'alert' : 'info')}<span class="grow">${esc(msg)}</span>${action ? `<a class="link-brand small" href="${esc(action.href)}">${esc(action.label)}</a>` : ''}`;
    box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .25s, transform .25s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(() => t.remove(), 260); }, 3600);
  }

  function modal({ title, body, foot = '', desc = '', width }) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${width ? `style="width:min(${width}px,100%)"` : ''}>
      <div class="modal-head"><div><h3>${title}</h3>${desc ? `<p class="small subtle mt-1">${desc}</p>` : ''}</div>
        <button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Zamknij">${icon('x', 'i-md')}</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => e.key === 'Escape' && close();
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    bg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    hydrate(bg);
    const first = bg.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return { el: bg.querySelector('.modal'), close };
  }

  function confirmDialog(message, { ok = 'Potwierdź', danger = false, desc = '' } = {}) {
    return new Promise((resolve) => {
      const m = modal({
        title: esc(message), desc: esc(desc), body: '',
        foot: `<button class="btn btn-secondary" data-no>Anuluj</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(ok)}</button>`,
      });
      m.el.querySelector('.modal-body').remove();
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); m.close(); } };
      m.el.querySelector('[data-yes]').onclick = () => finish(true);
      m.el.querySelector('[data-no]').onclick = () => finish(false);
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); if (!done) { done = true; resolve(false); } } });
      obs.observe(document.body, { childList: true });
    });
  }

  function copy(text, label = 'Skopiowano do schowka') {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(label, 'ok'), () => toast('Nie udało się skopiować', 'err'));
  }

  // Bezpieczny mini-markdown
  function md(src) {
    const lines = esc(src || '').split(/\r?\n/);
    let html = ''; let list = null;
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener nofollow">$1</a>');
    const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const l of lines) {
      let m;
      if ((m = l.match(/^###\s+(.*)/))) { closeList(); html += `<h3>${inline(m[1])}</h3>`; }
      else if ((m = l.match(/^##\s+(.*)/))) { closeList(); html += `<h2>${inline(m[1])}</h2>`; }
      else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+\.\s+(.*)/))) { if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if (!l.trim()) closeList();
      else { closeList(); html += `<p>${inline(l)}</p>`; }
    }
    closeList();
    return html;
  }

  function stars(rating, cls = 'i-sm') {
    const r = Math.round(Number(rating || 0));
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<svg class="i ${cls}" viewBox="0 0 24 24" style="${i <= r ? 'fill:#fbbf24;stroke:none' : 'fill:#262938;stroke:none'}">${VSIcons.icon('star').match(/<path[^>]*>/)[0]}</svg>`;
    return `<span class="row" style="gap:2px">${s}</span>`;
  }
  function rating(p) {
    if (!p.rating) return '<span class="xs faint">Brak ocen</span>';
    return `<span class="rating">${icon('star', 'i-sm')}${Number(p.rating).toFixed(1)}<span class="n">(${p.reviews_count})</span></span>`;
  }

  function avatar(u, cls = '') {
    const name = u.username || u.store_name || '?';
    return u.avatar_url ? `<img src="${esc(u.avatar_url)}" class="avatar ${cls}" alt="">`
      : `<span class="avatar avatar-fallback ${cls}">${esc(name[0].toUpperCase())}</span>`;
  }

  const CAT = {
    'minecraft-plugins': ['Plugin Minecraft', 'plug'], 'minecraft-maps': ['Mapa Minecraft', 'map'], 'minecraft-builds': ['Budowla Minecraft', 'blocks'],
    'fivem-scripts': ['Skrypt FiveM', 'file-code'], 'fivem-maps': ['Mapa FiveM', 'pin'], 'fivem-interiors': ['Interior FiveM', 'house'], 'fivem-vehicles': ['Pojazd FiveM', 'car'],
    mods: ['Mod', 'gamepad'], 'discord-bots': ['Bot / skrypt', 'bot'], graphics: ['Grafika', 'palette'], web: ['Szablon WWW', 'layout'], other: ['Inne', 'package'],
  };
  const CAT_NAMES = Object.fromEntries(Object.entries(CAT).map(([k, v]) => [k, v[0]]));
  const catIcon = (id) => (CAT[id] || [0, 'package'])[1];

  let categoriesCache = null;
  const categories = () => (categoriesCache ??= api('/api/categories').catch(() => []));

  function productCard(p) {
    const inCart = cart.has(p.id);
    const data = esc(JSON.stringify({ id: p.id, title: p.title, price: p.price, cover_url: p.cover_url, slug: p.slug, store_name: p.store_name }));
    return `<article class="pcard reveal">
      <a href="/produkt/${esc(p.slug)}" class="pcard-media" tabindex="-1" aria-hidden="true">
        ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : `<div class="row center" style="height:100%;color:var(--text-4)">${icon('image', 'i-xl')}</div>`}
        <div class="pcard-flags">${p.featured ? `<span class="badge badge-solid">${icon('flame', 'i-xs')}Polecane</span>` : ''}${!p.price ? '<span class="badge">Darmowe</span>' : ''}</div>
      </a>
      <div class="pcard-body">
        <div class="pcard-cat row gap-2">${icon(catIcon(p.category), 'i-sm')}${esc(CAT_NAMES[p.category] || p.category)}</div>
        <a href="/produkt/${esc(p.slug)}" class="pcard-title clamp-1">${esc(p.title)}</a>
        <a href="/tworca/${esc(p.store_slug)}" class="pcard-seller"><span class="truncate">${esc(p.store_name || '')}</span>${icon('check-circle', 'i-xs verified')}</a>
        <div class="pcard-foot">
          <div class="col" style="gap:2px"><span class="price ${p.price ? '' : 'price-free'}">${fmt.price(p.price)}</span>${rating(p)}</div>
          <button class="btn btn-sm ${inCart ? 'btn-secondary' : 'btn-outline'} btn-icon" data-add-cart="${data}" aria-label="${inCart ? 'W koszyku' : 'Dodaj do koszyka'}" title="${inCart ? 'W koszyku' : 'Dodaj do koszyka'}">
            ${icon(inCart ? 'check' : 'cart', 'i-md')}</button>
        </div>
      </div>
    </article>`;
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add-cart]');
    if (!b) return;
    e.preventDefault();
    const p = JSON.parse(b.getAttribute('data-add-cart'));
    if (cart.has(p.id)) { location.href = '/koszyk.html'; return; }
    cart.add(p);
    b.classList.replace('btn-outline', 'btn-secondary');
    b.innerHTML = icon('check', 'i-md');
    b.title = 'W koszyku';
  });

  // ---------- Animacje wejścia ----------
  let observer;
  function reveal() {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); return; }
    observer ??= new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); observer.unobserve(en.target); }
    }), { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => observer.observe(el));
  }

  // ---------- Layout ----------
  let me = null;
  const meReady = api('/api/auth/me').then((d) => (me = d.user)).catch(() => null);

  const NAV = [
    ['/sklep.html', 'Przeglądaj', 'Sklep'],
    ['/sklep.html?category=fivem-scripts,fivem-maps,fivem-interiors,fivem-vehicles', 'FiveM', 'FiveM'],
    ['/sklep.html?category=minecraft-plugins,minecraft-maps,minecraft-builds', 'Minecraft', 'Minecraft'],
    ['/tworcy.html', 'Dla twórców', 'Twórcy'],
    ['/docs.html', 'API licencji', 'Docs'],
  ];

  function headerHtml(active) {
    return `
    <div id="announce" class="announce" hidden></div>
    <header class="site-header">
      <div class="container">
        <a href="/" class="brand" aria-label="Velorie Store — strona główna">
          <img src="${LOGO}" alt="Velorie" width="30" height="30" />
          <span class="brand-name">Velorie <span>Store</span></span>
        </a>
        <nav class="nav" aria-label="Główna nawigacja">
          ${NAV.map(([h, t, k]) => `<a href="${h}" class="nav-link ${active === k ? 'active' : ''}">${t}</a>`).join('')}
        </nav>
        <form action="/sklep.html" class="header-search input-icon" role="search">
          ${icon('search', 'i-md')}
          <input name="q" class="input" placeholder="Szukaj produktów…" aria-label="Szukaj produktów" autocomplete="off" />
          <span class="kbd hide-md">/</span>
        </form>
        <div class="header-actions">
          <a href="/koszyk.html" class="btn btn-ghost btn-icon relative" aria-label="Koszyk">${icon('cart')}<span id="cart-count" class="cart-count" hidden></span></a>
          <div id="user-slot" class="row gap-2"><div class="skeleton" style="width:92px;height:36px;border-radius:10px"></div></div>
          <button id="menu-btn" class="btn btn-ghost btn-icon show-md" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
        </div>
      </div>
    </header>
    <div id="mobile-nav" class="mobile-nav" hidden><div class="container">
      ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
      <form action="/sklep.html" class="input-icon mt-2">${icon('search', 'i-md')}<input name="q" class="input" placeholder="Szukaj produktów…"></form>
    </div></div>`;
  }

  function userSlot() {
    const slot = document.getElementById('user-slot');
    if (!slot) return;
    if (!me) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      slot.innerHTML = `<a href="/auth.html?next=${next}" class="btn btn-ghost hide-sm">Zaloguj się</a>
        <a href="/auth.html?mode=register&next=${next}" class="btn btn-primary btn-sm" style="--h:34px">Załóż konto</a>`;
      return;
    }
    slot.innerHTML = `<div class="relative">
      <button id="user-btn" class="btn btn-ghost" style="padding:0 6px 0 4px;gap:8px" aria-haspopup="menu" aria-expanded="false">${avatar(me, 'avatar-sm')}<span class="hide-sm small strong truncate" style="max-width:120px">${esc(me.username)}</span>${icon('chevron-down', 'i-sm subtle')}</button>
      <div id="user-menu" class="dropdown" role="menu" hidden>
        <div class="dropdown-head row gap-3">${avatar(me, 'avatar-lg')}<div class="grow"><div class="strong truncate">${esc(me.username)}</div><div class="xs subtle truncate">${esc(me.email || (me.discord_username ? 'Discord · ' + me.discord_username : ''))}</div></div></div>
        <a href="/panel.html#/account/overview">${icon('grid', 'i-md')}Panel</a>
        <a href="/panel.html#/account/library">${icon('library', 'i-md')}Biblioteka</a>
        <a href="/panel.html#/account/licenses">${icon('key', 'i-md')}Licencje</a>
        <a href="/panel.html#/account/orders">${icon('receipt', 'i-md')}Transakcje</a>
        <div class="sep"></div>
        ${me.is_seller ? `<a href="/panel.html#/seller/stats">${icon('chart', 'i-md')}Panel twórcy</a>` : `<a href="/panel.html#/seller/join">${icon('rocket', 'i-md')}Zacznij sprzedawać</a>`}
        ${me.is_admin ? `<a href="/panel.html#/admin/overview">${icon('shield', 'i-md')}Administracja</a>` : ''}
        <a href="/panel.html#/account/settings">${icon('settings', 'i-md')}Ustawienia</a>
        <div class="sep"></div>
        <button id="logout-btn">${icon('log-out', 'i-md')}Wyloguj się</button>
      </div></div>`;
    const btn = document.getElementById('user-btn');
    const menu = document.getElementById('user-menu');
    btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
    document.addEventListener('click', (e) => { if (!e.target.closest('#user-menu')) menu.hidden = true; });
    document.getElementById('logout-btn').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; };
  }

  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const n = cart.count();
    el.textContent = n;
    el.hidden = !n;
  }
  document.addEventListener('cart:change', updateCartCount);
  window.addEventListener('storage', (e) => e.key === CART_KEY && updateCartCount());

  function footerHtml() {
    const col = (title, links) => `<div><h4>${title}</h4><ul>${links.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`;
    return `<footer class="site-footer"><div class="container">
      <div class="footer-grid">
        <div>
          <a href="/" class="brand"><img src="${LOGO}" alt="Velorie" width="30" height="30"><span class="brand-name">Velorie <span>Store</span></span></a>
          <p class="small subtle mt-4" style="max-width:320px">Marketplace z zasobami dla serwerów gier — pluginy, skrypty, mapy i mody z licencją od zweryfikowanych twórców.</p>
          <div class="row gap-2 mt-5">
            <a href="https://discord.gg/velorie" target="_blank" rel="noopener" class="btn btn-secondary btn-sm btn-icon" aria-label="Discord">${icon('discord', 'i-md')}</a>
            <a href="mailto:kontakt@velorie.store" class="btn btn-secondary btn-sm btn-icon" aria-label="E-mail">${icon('mail', 'i-md')}</a>
          </div>
        </div>
        ${col('Sklep', [['/sklep.html?category=fivem-scripts', 'Skrypty FiveM'], ['/sklep.html?category=fivem-interiors', 'Interiory FiveM'], ['/sklep.html?category=minecraft-plugins', 'Pluginy Minecraft'], ['/sklep.html?category=minecraft-maps', 'Mapy Minecraft'], ['/sklep.html?free=1', 'Darmowe']])}
        ${col('Twórcy', [['/tworcy.html', 'Sprzedawaj na Velorie'], ['/panel.html#/seller/stats', 'Panel twórcy'], ['/docs.html', 'API licencji'], ['/tworcy.html#cennik', 'Prowizje']])}
        ${col('Konto', [['/panel.html#/account/library', 'Biblioteka'], ['/panel.html#/account/licenses', 'Licencje'], ['/panel.html#/account/orders', 'Transakcje'], ['/panel.html#/account/settings', 'Ustawienia']])}
        ${col('Pomoc', [['/#faq', 'FAQ'], ['https://discord.gg/velorie', 'Wsparcie na Discordzie'], ['mailto:kontakt@velorie.store', 'Kontakt'], ['/regulamin.html', 'Regulamin']])}
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Velorie Store. Wszelkie prawa zastrzeżone.</span>
        <span class="row gap-2"><span class="status-dot"></span>Wszystkie systemy działają</span>
      </div>
    </div></footer>`;
  }

  async function announce() {
    try {
      const d = await api('/api/infobar');
      const bar = document.getElementById('announce');
      if (!bar || !d || !d.isActive || !d.text) return;
      bar.style.background = d.bgColor || '#ff0354';
      bar.style.color = d.textColor || '#fff';
      bar.innerHTML = `<span>${esc(d.text)}</span>${d.linkUrl && d.linkText ? `<a href="${esc(d.linkUrl)}">${esc(d.linkText)}${icon('arrow-right', 'i-sm')}</a>` : ''}`;
      bar.hidden = false;
    } catch {}
  }

  function layout({ active, footer = true, app = false } = {}) {
    if (app) document.body.classList.add('is-app');
    document.body.insertAdjacentHTML('afterbegin', '<div class="page-glow" aria-hidden="true"></div>');
    const h = document.getElementById('vs-header');
    if (h) h.outerHTML = headerHtml(active);
    const f = document.getElementById('vs-footer');
    if (f) f.outerHTML = footer ? footerHtml() : '';
    const mb = document.getElementById('menu-btn');
    const mn = document.getElementById('mobile-nav');
    if (mb) mb.onclick = () => { mn.hidden = !mn.hidden; mb.setAttribute('aria-expanded', String(!mn.hidden)); };
    const q = new URLSearchParams(location.search).get('q') || '';
    document.querySelectorAll('input[name=q]').forEach((i) => { if (!i.value) i.value = q; });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        const s = document.querySelector('.header-search input');
        if (s && s.offsetParent) { e.preventDefault(); s.focus(); }
      }
    });
    updateCartCount();
    announce();
    meReady.then(userSlot);
    hydrate();
    reveal();
  }

  function icons(root) { hydrate(root); }

  window.VS = {
    api, upload, esc, fmt, cart, toast, modal, confirm: confirmDialog, copy, md, stars, rating, avatar, icon, icons,
    productCard, categories, CAT_NAMES, catIcon, reveal, layout, LOGO,
    get me() { return me; }, meReady, setMe(u) { me = u; userSlot(); },
  };
})();
