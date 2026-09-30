/* Velorie Store — wspólny skrypt frontendu */
(function () {
  const LOGO = 'https://i.imgur.com/NDhlWyz.png';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = {
    price(v, freeLabel = 'Darmowy') {
      if (!v) return freeLabel;
      return (v / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
    },
    money(v) { return ((v || 0) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'; },
    date(t) { return t ? new Date(t).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; },
    datetime(t) { return t ? new Date(t).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; },
    rel(t) {
      if (!t) return '—';
      const s = (Date.now() - t) / 1000;
      if (s < 60) return 'przed chwilą';
      if (s < 3600) return `${Math.floor(s / 60)} min temu`;
      if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
      if (s < 86400 * 30) return `${Math.floor(s / 86400)} dni temu`;
      return fmt.date(t);
    },
    size(b) {
      if (!b) return '—';
      const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
      while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
      return `${b.toFixed(i ? 1 : 0)} ${u[i]}`;
    },
    num(n) { return Number(n || 0).toLocaleString('pl-PL'); },
  };

  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { ...(opts.headers || {}) }, credentials: 'same-origin' };
    if (opts.raw) { init.body = opts.raw; }
    else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
    const res = await fetch(path, init);
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error) || `Błąd ${res.status}`);
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }

  // Upload z postępem (XHR)
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

  // ---------- Koszyk (localStorage) ----------
  const CART_KEY = 'vs_cart';
  const cart = {
    items() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } },
    save(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {} document.dispatchEvent(new CustomEvent('cart:change')); },
    has(id) { return cart.items().some((i) => i.id === id); },
    add(p) {
      if (cart.has(p.id)) { toast('Produkt jest już w koszyku'); return; }
      cart.save([...cart.items(), { id: p.id, title: p.title, price: p.price, cover_url: p.cover_url, slug: p.slug, store_name: p.store_name }]);
      toast(`Dodano do koszyka: ${p.title}`, 'ok');
    },
    remove(id) { cart.save(cart.items().filter((i) => i.id !== id)); },
    clear() { cart.save([]); },
    count() { return cart.items().length; },
  };

  // ---------- Toasty i modale ----------
  function toast(msg, tone = 'info') {
    let box = document.getElementById('vs-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'vs-toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = `toast ${tone}`;
    const icon = tone === 'ok' ? 'check-circle-2' : tone === 'err' ? 'alert-circle' : 'info';
    t.innerHTML = `<i data-lucide="${icon}" class="h-4 w-4 shrink-0 ${tone === 'ok' ? 'text-emerald-400' : tone === 'err' ? 'text-[var(--accent)]' : 'text-white/60'}"></i><span>${esc(msg)}</span>`;
    box.appendChild(t);
    icons();
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3500);
  }

  function modal(html, { onMount } = {}) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal glass p-6 relative"><button data-close class="absolute right-4 top-4 rounded-xl btn-ghost p-2" aria-label="Zamknij"><i data-lucide="x" class="h-4 w-4"></i></button>${html}</div>`;
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => e.key === 'Escape' && close();
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    icons();
    onMount && onMount(bg.querySelector('.modal'), close);
    return close;
  }

  function confirmDialog(message, { ok = 'Potwierdź', danger = false } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const close = modal(`<h3 class="text-lg font-bold pr-10">${esc(message)}</h3>
        <div class="mt-6 flex justify-end gap-2"><button data-no class="rounded-xl btn-ghost px-4 py-2 text-sm">Anuluj</button>
        <button data-yes class="rounded-xl ${danger ? 'btn-danger' : 'btn-primary'} px-4 py-2 text-sm font-semibold">${esc(ok)}</button></div>`, {
        onMount(el) {
          el.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); close(); };
          el.querySelector('[data-no]').onclick = () => { done = true; resolve(false); close(); };
        },
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(document.querySelector('.modal-bg')) && !done) { resolve(false); obs.disconnect(); } });
      obs.observe(document.body, { childList: true });
    });
  }

  function icons() { if (window.lucide) window.lucide.createIcons(); }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => toast('Skopiowano do schowka', 'ok'), () => toast('Nie udało się skopiować', 'err'));
  }

  // Bezpieczny mini-markdown (najpierw escapowanie)
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
      else if (!l.trim()) { closeList(); }
      else { closeList(); html += `<p>${inline(l)}</p>`; }
    }
    closeList();
    return html;
  }

  function stars(rating, size = 'h-3.5 w-3.5') {
    const r = Math.round(Number(rating || 0));
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<i data-lucide="star" class="${size} ${i <= r ? 'text-amber-400 fill-amber-400' : 'text-white/20'}"></i>`;
    return `<span class="inline-flex items-center gap-0.5">${s}</span>`;
  }

  let categoriesCache = null;
  async function categories() {
    if (!categoriesCache) categoriesCache = api('/api/categories').catch(() => []);
    return categoriesCache;
  }
  const CAT_NAMES = {
    'minecraft-plugins': 'Plugin Minecraft', 'minecraft-maps': 'Mapa Minecraft', 'minecraft-builds': 'Budowla Minecraft',
    'fivem-scripts': 'Skrypt FiveM', 'fivem-maps': 'Mapa FiveM', 'fivem-interiors': 'Interior FiveM', 'fivem-vehicles': 'Pojazd FiveM',
    mods: 'Mod', 'discord-bots': 'Bot / skrypt', graphics: 'Grafika', web: 'Szablon WWW', other: 'Inne',
  };

  function productCard(p) {
    const inCart = cart.has(p.id);
    return `<article class="product-card glass lift animate-on-scroll">
      <a href="/produkt/${esc(p.slug)}" class="cover block">
        ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="h-full w-full grid place-items-center text-white/30"><i data-lucide="package" class="h-10 w-10"></i></div>`}
        <span class="absolute left-3 top-3 chip backdrop-blur">${esc(CAT_NAMES[p.category] || p.category)}</span>
        ${p.featured ? `<span class="absolute right-3 top-3 badge badge-red backdrop-blur"><i data-lucide="flame" class="h-3 w-3"></i>Polecane</span>` : ''}
      </a>
      <div class="p-4 flex flex-col gap-2 flex-1">
        <a href="/produkt/${esc(p.slug)}" class="font-bold leading-snug hover:text-white line-clamp-1">${esc(p.title)}</a>
        <p class="text-xs text-white/60 line-clamp-2 min-h-[2.5em]">${esc(p.summary || '')}</p>
        <div class="flex items-center justify-between text-xs text-white/55">
          <a href="/tworca/${esc(p.store_slug)}" class="hover:text-white truncate">${esc(p.store_name || '')}</a>
          <span class="flex items-center gap-1">${p.rating ? `${stars(p.rating, 'h-3 w-3')}<span>(${p.reviews_count})</span>` : '<span class="text-white/35">Brak ocen</span>'}</span>
        </div>
        <div class="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-white/10">
          <div class="text-lg font-black ${p.price ? '' : 'text-emerald-400'}">${fmt.price(p.price)}</div>
          <button data-add-cart='${esc(JSON.stringify({ id: p.id, title: p.title, price: p.price, cover_url: p.cover_url, slug: p.slug, store_name: p.store_name }))}'
            class="inline-flex items-center gap-1.5 rounded-xl ${inCart ? 'btn-ghost' : 'btn-primary'} px-3 py-2 text-xs font-semibold" aria-label="Dodaj do koszyka">
            <i data-lucide="${inCart ? 'check' : 'shopping-cart'}" class="h-4 w-4"></i><span>${inCart ? 'W koszyku' : 'Do koszyka'}</span>
          </button>
        </div>
      </div>
    </article>`;
  }

  // Delegacja kliknięć "do koszyka"
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add-cart]');
    if (!b) return;
    e.preventDefault();
    const p = JSON.parse(b.getAttribute('data-add-cart'));
    if (!cart.has(p.id)) cart.add(p);
    b.className = b.className.replace('btn-primary', 'btn-ghost');
    b.innerHTML = '<i data-lucide="check" class="h-4 w-4"></i><span>W koszyku</span>';
    icons();
  });

  // ---------- Animacje ----------
  let observer;
  function reveal() {
    observer ??= new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); observer.unobserve(en.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.animate-on-scroll:not(.is-visible)').forEach((el) => observer.observe(el));
  }

  // ---------- Layout ----------
  let me = null;
  const meReady = api('/api/auth/me').then((d) => (me = d.user)).catch(() => null);

  function background() {
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="aurora" aria-hidden="true"><div class="blob b1"></div><div class="blob b2"></div></div>
      <div class="grid-bg" aria-hidden="true"></div><div class="noise" aria-hidden="true"></div>
      <div id="scroll-progress" aria-hidden="true"></div>`);
    const bar = document.getElementById('scroll-progress');
    const upd = () => {
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      bar.style.width = h > 0 ? `${(window.scrollY / h) * 100}%` : '0';
    };
    window.addEventListener('scroll', upd, { passive: true });
  }

  function headerHtml(active) {
    const nav = [
      ['/', 'Start', 'home'], ['/sklep.html', 'Sklep', 'store'], ['/sklep.html?category=fivem-scripts,fivem-maps,fivem-interiors,fivem-vehicles', 'FiveM', 'car'],
      ['/sklep.html?category=minecraft-plugins,minecraft-maps,minecraft-builds', 'Minecraft', 'blocks'], ['/docs.html', 'API licencji', 'key-round'],
    ];
    return `
    <div id="top-info-bar" class="hidden relative w-full z-[45] px-4 py-2 text-center text-sm font-medium">
      <div class="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
        <span id="info-bar-text"></span>
        <a id="info-bar-link" href="#" class="hidden px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition text-xs font-bold uppercase tracking-wider"></a>
      </div>
    </div>
    <header class="sticky top-0 z-40 glass-soft">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
        <a href="/" class="flex items-center gap-3 min-w-0 shrink-0">
          <img src="${LOGO}" alt="Velorie" class="brand-logo" />
          <div class="leading-tight min-w-0 hidden sm:block">
            <div class="text-base sm:text-lg font-semibold tracking-tight">Velorie Store</div>
            <div class="text-[11px] sm:text-xs text-white/60">Marketplace • Licencje • Twórcy</div>
          </div>
        </a>
        <nav class="hidden xl:flex items-center gap-1 text-sm text-white/70">
          ${nav.map(([h, t]) => `<a href="${h}" class="rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white transition ${active === t ? 'text-white bg-white/5' : ''}">${t}</a>`).join('')}
        </nav>
        <form action="/sklep.html" class="hidden md:flex flex-1 max-w-sm items-center relative">
          <i data-lucide="search" class="h-4 w-4 absolute left-3 text-white/40"></i>
          <input name="q" class="field !py-2 !pl-9 text-sm" placeholder="Szukaj skryptów, map, pluginów…" aria-label="Szukaj" />
        </form>
        <div class="flex items-center gap-2 shrink-0">
          <a href="/koszyk.html" class="relative inline-flex items-center justify-center rounded-xl btn-ghost lift h-10 w-10" aria-label="Koszyk">
            <i data-lucide="shopping-cart" class="h-5 w-5"></i>
            <span id="cart-count" class="hidden absolute -right-1.5 -top-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[var(--accent)] text-[11px] font-bold grid place-items-center"></span>
          </a>
          <div id="user-slot" class="flex items-center gap-2"><div class="skeleton h-10 w-28"></div></div>
          <button id="menu-btn" type="button" class="inline-flex xl:hidden items-center justify-center rounded-xl btn-ghost lift h-10 w-10" aria-label="Menu" aria-expanded="false">
            <i data-lucide="menu" class="h-5 w-5"></i>
          </button>
        </div>
      </div>
      <div id="mobile-nav" hidden class="xl:hidden border-t border-white/10">
        <div class="mx-auto max-w-7xl px-4 py-3 grid gap-2 text-sm text-white/80">
          <form action="/sklep.html" class="md:hidden relative"><i data-lucide="search" class="h-4 w-4 absolute left-3 top-3 text-white/40"></i><input name="q" class="field !pl-9 text-sm" placeholder="Szukaj…" /></form>
          ${nav.map(([h, t, i]) => `<a href="${h}" class="rounded-xl px-3 py-2 hover:bg-white/5 flex items-center gap-2"><i data-lucide="${i}" class="h-4 w-4"></i>${t}</a>`).join('')}
        </div>
      </div>
    </header>`;
  }

  function userSlot() {
    const slot = document.getElementById('user-slot');
    if (!slot) return;
    if (!me) {
      slot.innerHTML = `<a href="/auth.html?next=${encodeURIComponent(location.pathname + location.search)}" class="inline-flex items-center gap-2 rounded-xl btn-primary lift px-4 py-2 text-sm font-semibold h-10">
        <i data-lucide="user" class="h-4 w-4"></i><span class="hidden sm:inline">Zaloguj się</span></a>`;
    } else {
      const av = me.avatar_url ? `<img src="${esc(me.avatar_url)}" class="h-8 w-8 rounded-full object-cover" alt="">` : `<span class="h-8 w-8 rounded-full grid place-items-center bg-gradient-to-br from-[#ff0354] to-[#7c3aed] text-sm font-bold">${esc((me.username || '?')[0].toUpperCase())}</span>`;
      slot.innerHTML = `<div class="relative">
        <button id="user-btn" class="inline-flex items-center gap-2 rounded-xl btn-ghost lift pl-1 pr-3 h-10" aria-haspopup="menu">${av}<span class="hidden sm:inline text-sm font-medium max-w-[110px] truncate">${esc(me.username)}</span><i data-lucide="chevron-down" class="h-4 w-4 text-white/50"></i></button>
        <div id="user-menu" hidden class="absolute right-0 mt-2 w-60 glass rounded-2xl p-2 text-sm z-50">
          <div class="px-3 py-2 border-b border-white/10 mb-1"><div class="font-semibold truncate">${esc(me.username)}</div><div class="text-xs text-white/50 truncate">${esc(me.email || (me.discord_username ? 'Discord: ' + me.discord_username : ''))}</div></div>
          <a href="/panel.html#/account/overview" class="side-link"><i data-lucide="layout-dashboard" class="h-4 w-4"></i>Mój panel</a>
          <a href="/panel.html#/account/library" class="side-link"><i data-lucide="library" class="h-4 w-4"></i>Biblioteka</a>
          <a href="/panel.html#/account/orders" class="side-link"><i data-lucide="receipt" class="h-4 w-4"></i>Transakcje</a>
          ${me.is_seller ? `<a href="/panel.html#/seller/stats" class="side-link"><i data-lucide="chart-line" class="h-4 w-4"></i>Panel twórcy</a>` : `<a href="/panel.html#/seller/join" class="side-link"><i data-lucide="rocket" class="h-4 w-4"></i>Zostań twórcą</a>`}
          ${me.is_admin ? `<a href="/panel.html#/admin/overview" class="side-link"><i data-lucide="shield" class="h-4 w-4"></i>Administracja</a>` : ''}
          <button id="logout-btn" class="side-link w-full text-left text-[#ff7aa0]"><i data-lucide="log-out" class="h-4 w-4"></i>Wyloguj</button>
        </div></div>`;
      const btn = document.getElementById('user-btn');
      const menu = document.getElementById('user-menu');
      btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
      document.addEventListener('click', (e) => { if (!e.target.closest('#user-menu')) menu.hidden = true; });
      document.getElementById('logout-btn').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; };
    }
    icons();
  }

  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const n = cart.count();
    el.textContent = n;
    el.classList.toggle('hidden', !n);
  }
  document.addEventListener('cart:change', updateCartCount);
  window.addEventListener('storage', (e) => e.key === CART_KEY && updateCartCount());

  function footerHtml() {
    return `<footer class="relative z-10 border-t border-white/10 glass-soft mt-16">
      <div class="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div class="space-y-4">
          <div class="flex items-center gap-3"><img src="${LOGO}" alt="logo" class="h-10 w-auto" />
            <div><div class="font-bold">Velorie Store</div><div class="text-xs text-white/60">© ${new Date().getFullYear()} · Wszelkie prawa zastrzeżone.</div></div></div>
          <p class="text-sm text-white/70">Marketplace dla twórców gier: pluginy, skrypty, mapy, interiory i mody — z wbudowanym systemem licencji.</p>
          <div class="flex flex-wrap gap-2">
            <a href="https://discord.gg/velorie" target="_blank" rel="noopener" class="rounded-full btn-ghost lift px-3 py-1 text-xs">Discord</a>
            <a href="mailto:kontakt@velorie.store" class="rounded-full btn-ghost lift px-3 py-1 text-xs">E-mail</a>
          </div>
        </div>
        <div><div class="font-semibold mb-3">Sklep</div><ul class="space-y-2 text-sm text-white/70">
          <li><a class="hover:text-white" href="/sklep.html?category=fivem-scripts">Skrypty FiveM</a></li>
          <li><a class="hover:text-white" href="/sklep.html?category=fivem-interiors">Interiory FiveM</a></li>
          <li><a class="hover:text-white" href="/sklep.html?category=minecraft-plugins">Pluginy Minecraft</a></li>
          <li><a class="hover:text-white" href="/sklep.html?category=minecraft-maps">Mapy Minecraft</a></li>
          <li><a class="hover:text-white" href="/sklep.html?free=1">Darmowe</a></li></ul></div>
        <div><div class="font-semibold mb-3">Dla twórców</div><ul class="space-y-2 text-sm text-white/70">
          <li><a class="hover:text-white" href="/panel.html#/seller/join">Zacznij sprzedawać</a></li>
          <li><a class="hover:text-white" href="/docs.html">API licencji</a></li>
          <li><a class="hover:text-white" href="/#jak-to-dziala">Jak to działa</a></li>
          <li><a class="hover:text-white" href="/#faq">FAQ</a></li></ul></div>
        <div><div class="font-semibold mb-3">Konto</div>
          <p class="text-sm text-white/70 mb-4">Kupione produkty, klucze licencji i historia transakcji w jednym miejscu.</p>
          <a href="/panel.html" class="w-full justify-center inline-flex items-center gap-2 rounded-2xl btn-primary lift px-4 py-3 font-semibold text-sm"><i data-lucide="layout-dashboard" class="h-4 w-4"></i>Przejdź do panelu</a></div>
      </div>
    </footer>`;
  }

  async function infobar() {
    try {
      const d = await api('/api/infobar');
      const bar = document.getElementById('top-info-bar');
      if (!bar || !d || !d.isActive || !d.text) return;
      bar.style.background = d.bgColor || '#ff0354';
      bar.style.color = d.textColor || '#fff';
      document.getElementById('info-bar-text').textContent = d.text;
      const a = document.getElementById('info-bar-link');
      if (d.linkUrl && d.linkText) { a.href = d.linkUrl; a.textContent = d.linkText; a.classList.remove('hidden'); a.style.color = d.textColor; }
      bar.classList.remove('hidden');
    } catch {}
  }

  function layout({ active, footer = true } = {}) {
    background();
    const h = document.getElementById('vs-header');
    if (h) h.outerHTML = headerHtml(active);
    const f = document.getElementById('vs-footer');
    if (f && footer) f.outerHTML = footerHtml();
    const mb = document.getElementById('menu-btn');
    const mn = document.getElementById('mobile-nav');
    mb && (mb.onclick = () => { mn.hidden = !mn.hidden; mb.setAttribute('aria-expanded', String(!mn.hidden)); });
    const qInput = document.querySelector('header input[name=q]');
    if (qInput) qInput.value = new URLSearchParams(location.search).get('q') || '';
    updateCartCount();
    infobar();
    meReady.then(userSlot);
    icons();
    reveal();
  }

  window.VS = { api, upload, esc, fmt, cart, toast, modal, confirm: confirmDialog, icons, copy, md, stars, productCard, categories, CAT_NAMES, reveal, layout, LOGO,
    get me() { return me; }, meReady, setMe(u) { me = u; userSlot(); } };
})();
