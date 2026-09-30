/* Velorie Store — panel użytkownika (kupujący), rdzeń routera */
(function () {
  const { api, esc, fmt, toast } = VS;
  const P = (window.Panel = { views: {}, charts: [] });

  // ---------- Pomocnicze komponenty ----------
  P.h = {
    title(t, sub, actions = '') {
      return `<div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div><h1 class="text-2xl sm:text-3xl font-black">${t}</h1>${sub ? `<p class="text-white/55 mt-1 text-sm">${sub}</p>` : ''}</div>
        <div class="flex flex-wrap gap-2">${actions}</div></div>`;
    },
    kpi(label, value, icon, { delta, hint } = {}) {
      const d = delta === undefined ? '' : `<span class="kpi-delta ${delta >= 0 ? 'up' : 'down'} text-xs font-semibold inline-flex items-center gap-0.5">
        <i data-lucide="${delta >= 0 ? 'trending-up' : 'trending-down'}" class="h-3.5 w-3.5"></i>${delta >= 0 ? '+' : ''}${delta}%</span>`;
      return `<div class="glass rounded-2xl p-4 sm:p-5">
        <div class="flex items-center justify-between"><span class="text-xs text-white/55">${label}</span>
          <span class="h-8 w-8 rounded-xl grid place-items-center bg-[var(--accent)]/12 text-[var(--accent)]"><i data-lucide="${icon}" class="h-4 w-4"></i></span></div>
        <div class="mt-2 text-2xl font-black tracking-tight">${value}</div>
        <div class="mt-1 flex items-center gap-2 text-xs text-white/45">${d}${hint ? `<span>${hint}</span>` : ''}</div></div>`;
    },
    card(title, body, extra = '') {
      return `<section class="glass rounded-3xl p-5 ${extra}">${title ? `<h2 class="font-bold mb-4">${title}</h2>` : ''}${body}</section>`;
    },
    empty(icon, text, cta = '') {
      return `<div class="text-center py-10"><i data-lucide="${icon}" class="h-10 w-10 mx-auto text-white/30"></i><p class="text-white/55 mt-3 text-sm">${text}</p>${cta ? `<div class="mt-4">${cta}</div>` : ''}</div>`;
    },
    status(s) {
      const m = {
        paid: ['badge-green', 'Opłacone'], pending: ['badge-yellow', 'Oczekuje'], failed: ['badge-red', 'Nieudane'], refunded: ['badge-gray', 'Zwrócone'],
        active: ['badge-green', 'Aktywna'], revoked: ['badge-red', 'Unieważniona'], published: ['badge-green', 'Opublikowany'], draft: ['badge-gray', 'Szkic'],
        blocked: ['badge-red', 'Zablokowany'], rejected: ['badge-red', 'Odrzucona'],
      }[s] || ['badge-gray', s];
      return `<span class="badge ${m[0]}">${m[1]}</span>`;
    },
    avatar(u, size = 'h-9 w-9') {
      return u.avatar_url ? `<img src="${esc(u.avatar_url)}" class="${size} rounded-full object-cover" alt="">`
        : `<span class="${size} rounded-full grid place-items-center bg-gradient-to-br from-[#ff0354] to-[#7c3aed] font-bold text-sm">${esc((u.username || u.store_name || '?')[0].toUpperCase())}</span>`;
    },
    btn(label, icon, attrs = '', kind = 'btn-ghost') {
      return `<button ${attrs} class="inline-flex items-center gap-2 rounded-xl ${kind} lift px-4 py-2 text-sm font-semibold">${icon ? `<i data-lucide="${icon}" class="h-4 w-4"></i>` : ''}${label}</button>`;
    },
  };
  const h = P.h;

  P.render = (html) => {
    P.charts.forEach((c) => c.destroy());
    P.charts = [];
    document.getElementById('view').innerHTML = html;
    VS.icons();
  };
  P.$ = (sel) => document.querySelector('#view ' + sel);
  P.$$ = (sel) => [...document.querySelectorAll('#view ' + sel)];
  P.formData = (form) => Object.fromEntries([...form.elements].filter((e) => e.name).map((e) => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  P.guard = async (fn, okMsg) => {
    try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; }
    catch (e) { toast(e.message, 'err'); throw e; }
  };

  // ---------- Nawigacja ----------
  function sideNav() {
    const me = VS.me;
    const link = (hash, icon, label) => `<a href="#/${hash}" data-hash="${hash}" class="side-link"><i data-lucide="${icon}" class="h-4 w-4"></i>${label}</a>`;
    let html = `<div class="flex items-center gap-3 px-2 py-3 mb-1">${h.avatar(me, 'h-10 w-10')}<div class="min-w-0"><div class="font-semibold truncate">${esc(me.username)}</div>
      <div class="text-xs text-white/45 truncate">${me.is_seller ? esc(me.store_name) : 'Konto kupującego'}</div></div></div>
      <div class="side-title">Moje konto</div>
      ${link('account/overview', 'layout-dashboard', 'Przegląd')}
      ${link('account/library', 'library', 'Biblioteka')}
      ${link('account/licenses', 'key-round', 'Licencje')}
      ${link('account/orders', 'receipt', 'Transakcje')}
      ${link('account/wishlist', 'heart', 'Lista życzeń')}
      ${link('account/settings', 'settings', 'Ustawienia konta')}
      <div class="side-title">Panel twórcy</div>`;
    if (me.is_seller) {
      html += `${link('seller/stats', 'chart-line', 'Statystyki')}
        ${link('seller/products', 'package', 'Produkty')}
        ${link('seller/sales', 'shopping-bag', 'Sprzedaż')}
        ${link('seller/licenses', 'shield-check', 'Licencje klientów')}
        ${link('seller/coupons', 'ticket-percent', 'Kody rabatowe')}
        ${link('seller/reviews', 'star', 'Recenzje')}
        ${link('seller/payouts', 'wallet', 'Wypłaty')}
        ${link('seller/store', 'store', 'Ustawienia sklepu')}`;
    } else {
      html += `<a href="#/seller/join" data-hash="seller/join" class="side-link"><i data-lucide="rocket" class="h-4 w-4 text-[var(--accent)]"></i>Zostań twórcą</a>`;
    }
    if (me.is_admin) {
      html += `<div class="side-title">Administracja</div>
        ${link('admin/overview', 'shield', 'Platforma')}
        ${link('admin/products', 'boxes', 'Produkty')}
        ${link('admin/users', 'users', 'Użytkownicy')}
        ${link('admin/payouts', 'banknote', 'Wypłaty twórców')}
        ${link('admin/infobar', 'megaphone', 'Pasek informacyjny')}`;
    }
    document.getElementById('side').innerHTML = html;
    VS.icons();
  }

  function highlight(hash) {
    let label = '';
    document.querySelectorAll('#side [data-hash]').forEach((a) => {
      const on = hash === a.dataset.hash || hash.startsWith(a.dataset.hash + '/');
      a.classList.toggle('active', on);
      if (on) label = a.textContent.trim();
    });
    document.getElementById('side-current').textContent = label || 'Menu panelu';
  }

  async function route() {
    const raw = (location.hash.replace(/^#\/?/, '') || 'account/overview').split('?')[0];
    const parts = raw.split('/');
    let key = parts.slice(0, 2).join('/');
    const arg = parts[2];
    if (parts[0] === 'seller' && !VS.me.is_seller && key !== 'seller/join') key = 'seller/join';
    if (parts[0] === 'admin' && !VS.me.is_admin) key = 'account/overview';
    if (key === 'seller/join' && VS.me.is_seller) key = 'seller/stats';
    const view = P.views[key] || P.views['account/overview'];
    highlight(key);
    if (innerWidth < 1024) document.getElementById('side').classList.add('hidden');
    document.getElementById('view').innerHTML = '<div class="skeleton h-96"></div>';
    try { await view(arg); }
    catch (e) {
      if (e.status === 401) return (location.href = '/auth.html?next=' + encodeURIComponent('/panel.html' + location.hash));
      P.render(h.card('', h.empty('alert-triangle', esc(e.message))));
    }
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    if (qs.get('error')) toast(qs.get('error'), 'err');
    window.scrollTo({ top: 0 });
  }
  P.route = route;
  P.refreshMe = async () => { const d = await api('/api/auth/me'); VS.setMe(d.user); sideNav(); };

  // =================== WIDOKI: KUPUJĄCY ===================
  P.views['account/overview'] = async () => {
    const d = await api('/api/me/overview');
    const s = d.stats;
    P.render(`
      ${h.title(`Cześć, ${esc(VS.me.username)} 👋`, 'Twoje zakupy, licencje i aktualizacje w jednym miejscu.')}
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        ${h.kpi('Zamówienia', fmt.num(s.orders), 'receipt')}
        ${h.kpi('Wydano łącznie', fmt.money(s.spent), 'wallet', { hint: s.saved ? `zaoszczędzono ${fmt.money(s.saved)}` : '' })}
        ${h.kpi('Aktywne licencje', fmt.num(s.licenses), 'key-round')}
        ${h.kpi('Aktywacje serwerów', fmt.num(s.activations), 'server')}
      </div>
      <div class="grid xl:grid-cols-2 gap-6 mt-6">
        ${h.card('Ostatnie transakcje', d.recent_orders.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Numer</th><th>Data</th><th>Pozycje</th><th>Kwota</th><th>Status</th></tr></thead><tbody>
          ${d.recent_orders.map((o) => `<tr><td class="font-mono text-xs">${esc(o.number)}</td><td>${fmt.date(o.created_at)}</td><td>${o.items}</td><td class="font-semibold">${fmt.money(o.total)}</td><td>${h.status(o.status)}</td></tr>`).join('')}
          </tbody></table></div><a href="#/account/orders" class="mt-3 inline-flex text-sm text-[var(--accent)] hover:underline">Wszystkie transakcje →</a>`
          : h.empty('shopping-bag', 'Nie masz jeszcze zakupów.', '<a href="/sklep.html" class="inline-flex rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Przeglądaj sklep</a>'))}
        ${h.card('Aktualizacje Twoich produktów', d.updates.length ? `<div class="space-y-3">${d.updates.map((u) => `
          <a href="/produkt/${esc(u.slug)}" class="block glass-soft rounded-2xl p-4 hover:border-white/25">
            <div class="flex items-center justify-between gap-2"><span class="font-semibold truncate">${esc(u.title)}</span><span class="badge badge-violet">v${esc(u.version)}</span></div>
            <div class="text-xs text-white/50 mt-1">${fmt.rel(u.created_at)}</div>
            <div class="text-sm text-white/65 mt-2 line-clamp-2 whitespace-pre-line">${esc(u.changelog)}</div></a>`).join('')}</div>`
          : h.empty('bell', 'Brak aktualizacji.'))}
      </div>
      ${VS.me.is_seller ? '' : `<div class="mt-6 relative overflow-hidden rounded-3xl glass p-6 sm:p-8 border-[var(--accent)]/25">
        <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/20 blur-3xl"></div>
        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><div class="font-black text-xl">Tworzysz pluginy, skrypty albo mapy?</div><p class="text-white/65 text-sm mt-1">Otwórz sklep twórcy i zacznij sprzedawać z systemem licencji.</p></div>
          <a href="#/seller/join" class="inline-flex items-center gap-2 rounded-2xl btn-primary px-5 py-3 text-sm font-semibold"><i data-lucide="rocket" class="h-4 w-4"></i>Zostań twórcą</a></div></div>`}`);
  };

  P.views['account/library'] = async () => {
    const items = await api('/api/me/library');
    const draw = (filter = '') => {
      const list = items.filter((i) => (i.title + i.store_name).toLowerCase().includes(filter.toLowerCase()));
      P.$('#lib').innerHTML = list.length ? list.map((i) => `
        <article class="glass rounded-3xl overflow-hidden flex flex-col">
          <a href="/produkt/${esc(i.slug)}" class="aspect-video bg-black/30 block"><img src="${esc(i.cover_url || '')}" class="w-full h-full object-cover" alt=""></a>
          <div class="p-4 flex flex-col gap-3 flex-1">
            <div><a href="/produkt/${esc(i.slug)}" class="font-bold hover:underline line-clamp-1">${esc(i.title)}</a>
              <div class="text-xs text-white/50 flex flex-wrap gap-x-2"><span>${esc(i.store_name)}</span><span>•</span><span>v${esc(i.version)}</span><span>•</span><span>${fmt.date(i.acquired_at)}</span></div></div>
            ${i.license_enabled ? `<div class="rounded-xl bg-black/35 border border-white/10 p-3">
              <div class="flex items-center justify-between text-[11px] text-white/50 mb-1"><span>Klucz licencji</span>${h.status(i.license_status)}</div>
              <button data-copy="${esc(i.license_key)}" class="w-full flex items-center justify-between gap-2 font-mono text-sm hover:text-white text-white/85"><span class="truncate">${esc(i.license_key)}</span><i data-lucide="copy" class="h-4 w-4 shrink-0 text-white/40"></i></button>
              <div class="mt-2 text-[11px] text-white/50">Aktywacje: <b class="text-white/80">${i.activations}/${i.max_activations || '∞'}</b></div></div>` : ''}
            <div class="mt-auto flex flex-wrap gap-2">
              <a href="/api/products/${i.id}/download" class="flex-1 inline-flex justify-center items-center gap-2 rounded-xl btn-primary px-3 py-2 text-sm font-semibold ${i.license_status === 'revoked' ? 'pointer-events-none opacity-50' : ''}"><i data-lucide="download" class="h-4 w-4"></i>Pobierz</a>
              ${i.license_enabled && i.activations ? `<button data-reset="${i.license_id}" class="rounded-xl btn-ghost px-3 py-2 text-sm" title="Zresetuj aktywacje"><i data-lucide="rotate-ccw" class="h-4 w-4"></i></button>` : ''}
              <a href="/produkt/${esc(i.slug)}#recenzje" class="rounded-xl btn-ghost px-3 py-2 text-sm" title="${i.my_rating ? 'Twoja ocena: ' + i.my_rating : 'Oceń produkt'}"><i data-lucide="star" class="h-4 w-4 ${i.my_rating ? 'fill-amber-400 text-amber-400' : ''}"></i></a>
            </div>
          </div></article>`).join('')
        : `<div class="sm:col-span-2 2xl:col-span-3">${h.card('', h.empty('library', filter ? 'Brak wyników.' : 'Twoja biblioteka jest pusta.', '<a href="/sklep.html" class="inline-flex rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Przejdź do sklepu</a>'))}</div>`;
      P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy));
      P.$$('[data-reset]').forEach((b) => b.onclick = async () => {
        if (!(await VS.confirm('Zresetować wszystkie aktywacje tej licencji? Serwery będą musiały aktywować klucz ponownie.', { ok: 'Resetuj' }))) return;
        await P.guard(() => api(`/api/me/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane');
        P.views['account/library']();
      });
      VS.icons();
    };
    P.render(`${h.title('Biblioteka', `${items.length} ${items.length === 1 ? 'produkt' : 'produktów'} — pobieraj pliki i zarządzaj kluczami.`,
      `<div class="relative"><i data-lucide="search" class="h-4 w-4 absolute left-3 top-3 text-white/40"></i><input id="lib-q" class="field !pl-9 !py-2 text-sm w-60" placeholder="Szukaj w bibliotece"></div>`)}
      <div id="lib" class="grid sm:grid-cols-2 2xl:grid-cols-3 gap-5"></div>`);
    P.$('#lib-q').oninput = (e) => draw(e.target.value);
    draw();
  };

  P.views['account/licenses'] = async () => {
    const list = await api('/api/me/licenses');
    P.render(`${h.title('Licencje', 'Każdy serwer, na którym uruchomisz produkt, zajmuje jedną aktywację. Zwolnij stare, gdy zmieniasz hosting.', '<a href="/docs.html" class="inline-flex items-center gap-2 rounded-xl btn-ghost px-4 py-2 text-sm"><i data-lucide="book-open" class="h-4 w-4"></i>Jak działają licencje</a>')}
      <div class="space-y-4">${list.length ? list.map((l) => `
        <div class="glass rounded-3xl p-5">
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <img src="${esc(l.cover_url || '')}" class="w-full md:w-32 aspect-video rounded-xl object-cover bg-black/30" alt="">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap"><a href="/produkt/${esc(l.slug)}" class="font-bold hover:underline">${esc(l.title)}</a>${h.status(l.status)}</div>
              <button data-copy="${esc(l.license_key)}" class="mt-2 inline-flex items-center gap-2 font-mono text-sm rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 hover:border-white/30"><i data-lucide="key-round" class="h-4 w-4 text-[var(--accent)]"></i>${esc(l.license_key)}<i data-lucide="copy" class="h-3.5 w-3.5 text-white/40"></i></button>
              <div class="text-xs text-white/45 mt-2">Wydana ${fmt.date(l.created_at)} • aktywacje ${l.activations.length}/${l.max_activations || '∞'}</div>
            </div>
            ${l.activations.length ? `<button data-reset="${l.id}" class="inline-flex items-center gap-2 rounded-xl btn-ghost px-4 py-2 text-sm"><i data-lucide="rotate-ccw" class="h-4 w-4"></i>Resetuj wszystkie</button>` : ''}
          </div>
          ${l.activations.length ? `<div class="table-wrap mt-4"><table class="table"><thead><tr><th>Serwer / identyfikator</th><th>IP</th><th>Pierwsza aktywacja</th><th>Ostatnio widziany</th><th></th></tr></thead><tbody>
            ${l.activations.map((a) => `<tr><td class="font-mono text-xs">${esc(a.identifier)}</td><td class="text-white/60">${esc(a.ip || '—')}</td><td>${fmt.date(a.first_seen)}</td><td>${fmt.rel(a.last_seen)}</td>
              <td class="text-right"><button data-deact="${l.id}/${a.id}" class="text-xs text-white/50 hover:text-[var(--accent)] inline-flex items-center gap-1"><i data-lucide="unplug" class="h-3.5 w-3.5"></i>Zwolnij</button></td></tr>`).join('')}
            </tbody></table></div>` : '<p class="text-xs text-white/45 mt-4">Brak aktywnych serwerów — klucz aktywuje się przy pierwszym uruchomieniu.</p>'}
        </div>`).join('') : h.card('', h.empty('key-round', 'Nie masz jeszcze licencji.'))}</div>`);
    P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy));
    P.$$('[data-reset]').forEach((b) => b.onclick = async () => {
      if (!(await VS.confirm('Zresetować wszystkie aktywacje tej licencji?', { ok: 'Resetuj' }))) return;
      await P.guard(() => api(`/api/me/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane');
      P.views['account/licenses']();
    });
    P.$$('[data-deact]').forEach((b) => b.onclick = async () => {
      const [lid, aid] = b.dataset.deact.split('/');
      await P.guard(() => api(`/api/me/licenses/${lid}/activations/${aid}`, { method: 'DELETE' }), 'Aktywacja zwolniona');
      P.views['account/licenses']();
    });
  };

  P.views['account/orders'] = async () => {
    const orders = await api('/api/me/orders');
    const spent = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.total, 0);
    P.render(`${h.title('Transakcje', `${orders.length} zamówień • łącznie ${fmt.money(spent)}`)}
      ${orders.length ? `<div class="glass rounded-3xl p-2 sm:p-4"><div class="table-wrap"><table class="table">
        <thead><tr><th></th><th>Numer</th><th>Data</th><th>Produkty</th><th>Rabat</th><th>Kwota</th><th>Płatność</th><th>Status</th></tr></thead><tbody>
        ${orders.map((o) => `<tr class="cursor-pointer" data-toggle="${o.id}">
          <td><i data-lucide="chevron-right" class="h-4 w-4 text-white/40"></i></td>
          <td class="font-mono text-xs">${esc(o.number)}</td><td class="whitespace-nowrap">${fmt.datetime(o.created_at)}</td>
          <td class="max-w-[260px] truncate">${esc(o.items.map((i) => i.title).join(', '))}</td>
          <td class="text-emerald-400">${o.discount ? '−' + fmt.money(o.discount) : '—'}</td>
          <td class="font-semibold whitespace-nowrap">${fmt.money(o.total)}</td><td class="text-white/55 text-xs uppercase">${esc(o.provider || '')}</td><td>${h.status(o.status)}</td></tr>
          <tr class="hidden" data-detail="${o.id}"><td colspan="8" class="!bg-black/20"><div class="grid sm:grid-cols-2 gap-3 py-2">
            ${o.items.map((i) => `<div class="flex items-center gap-3 glass-soft rounded-xl p-2"><img src="${esc(i.cover_url || '')}" class="w-20 aspect-video object-cover rounded-lg" alt="">
              <div class="min-w-0 flex-1"><a href="/produkt/${esc(i.slug)}" class="font-semibold text-sm hover:underline line-clamp-1">${esc(i.title)}</a><div class="text-xs text-white/50">${fmt.money(i.price - i.discount)}${i.discount ? ` <s class="text-white/30">${fmt.money(i.price)}</s>` : ''}</div></div>
              ${o.status === 'paid' ? `<a href="/api/products/${i.product_id}/download" class="rounded-lg btn-ghost p-2" title="Pobierz"><i data-lucide="download" class="h-4 w-4"></i></a>` : ''}</div>`).join('')}
            ${o.coupon_code ? `<div class="text-xs text-white/50 sm:col-span-2">Użyty kod: <b class="text-white/80">${esc(o.coupon_code)}</b></div>` : ''}
          </div></td></tr>`).join('')}
        </tbody></table></div></div>` : h.card('', h.empty('receipt', 'Brak transakcji.'))}`);
    P.$$('[data-toggle]').forEach((r) => r.onclick = () => {
      const d = P.$(`[data-detail="${r.dataset.toggle}"]`);
      d.classList.toggle('hidden');
      r.querySelector('svg').style.transform = d.classList.contains('hidden') ? '' : 'rotate(90deg)';
    });
  };

  P.views['account/wishlist'] = async () => {
    const list = await api('/api/me/wishlist');
    P.render(`${h.title('Lista życzeń', 'Produkty, które zapisałeś na później.')}
      <div class="grid sm:grid-cols-2 2xl:grid-cols-3 gap-5">${list.length ? list.map((p) => `<div class="relative">${VS.productCard(p)}
        <button data-unwish="${p.id}" class="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 hover:bg-black/80" title="Usuń z listy"><i data-lucide="heart-off" class="h-4 w-4"></i></button></div>`).join('')
        : `<div class="sm:col-span-2 2xl:col-span-3">${h.card('', h.empty('heart', 'Lista życzeń jest pusta. Kliknij serduszko przy produkcie, aby go zapisać.'))}</div>`}</div>`);
    P.$$('.animate-on-scroll').forEach((e) => e.classList.add('is-visible'));
    P.$$('[data-unwish]').forEach((b) => b.onclick = async () => {
      await api('/api/me/wishlist/' + b.dataset.unwish, { method: 'DELETE' });
      P.views['account/wishlist']();
    });
  };

  P.views['account/settings'] = async () => {
    await P.refreshMe();
    const me = VS.me;
    const prov = await api('/api/auth/providers');
    const conn = (key, name, color, icon, connected, detail) => `
      <div class="flex items-center gap-3 glass-soft rounded-2xl p-4">
        <span class="h-10 w-10 rounded-xl grid place-items-center" style="background:${color}"><i data-lucide="${icon}" class="h-5 w-5"></i></span>
        <div class="flex-1 min-w-0"><div class="font-semibold">${name}</div><div class="text-xs text-white/50 truncate">${connected ? 'Połączono' + (detail ? ' • ' + esc(detail) : '') : prov[key] ? 'Niepołączone' : 'Niedostępne — brak konfiguracji OAuth'}</div></div>
        ${connected ? `<button data-unlink="${key}" class="rounded-xl btn-ghost px-3 py-2 text-xs">Odłącz</button>`
          : prov[key] ? `<a href="/auth/${key}?link=1&next=${encodeURIComponent('/panel.html#/account/settings')}" class="rounded-xl btn-primary px-3 py-2 text-xs font-semibold">Połącz</a>` : ''}
      </div>`;
    P.render(`${h.title('Ustawienia konta')}
      <div class="grid xl:grid-cols-2 gap-6">
        ${h.card('Profil', `<form id="profile" class="space-y-4">
          <div class="flex items-center gap-4">${h.avatar(me, 'h-16 w-16')}
            <label class="rounded-xl btn-ghost px-4 py-2 text-sm cursor-pointer inline-flex items-center gap-2"><i data-lucide="upload" class="h-4 w-4"></i>Zmień avatar<input type="file" id="avatar" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden"></label></div>
          <div><label class="label">Nazwa użytkownika</label><input name="username" class="field" value="${esc(me.username)}" maxlength="32"></div>
          <div><label class="label">O mnie</label><textarea name="bio" rows="3" class="field" maxlength="500">${esc(me.bio || '')}</textarea></div>
          <div><label class="label">E-mail</label><input class="field opacity-60" value="${esc(me.email || '— (konto założone przez Discord/Google)')}" disabled></div>
          <button class="rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold">Zapisz profil</button></form>`)}
        <div class="space-y-6">
          ${h.card('Metody logowania', `<div class="space-y-3">
            ${conn('google', 'Google', '#ffffff22', 'chrome', me.google)}
            ${conn('discord', 'Discord', '#5865F2', 'message-circle', me.discord, me.discord_username)}
            <div class="flex items-center gap-3 glass-soft rounded-2xl p-4"><span class="h-10 w-10 rounded-xl grid place-items-center bg-[var(--accent)]/20"><i data-lucide="mail" class="h-5 w-5"></i></span>
              <div class="flex-1"><div class="font-semibold">E-mail i hasło</div><div class="text-xs text-white/50">${me.has_password ? 'Ustawione' : 'Nie ustawiono hasła'}</div></div></div></div>`)}
          ${h.card(me.has_password ? 'Zmień hasło' : 'Ustaw hasło', `<form id="pw" class="space-y-3">
            ${!me.email ? '<div><label class="label">E-mail do logowania</label><input name="email" type="email" class="field" required></div>' : ''}
            ${me.has_password ? '<div><label class="label">Obecne hasło</label><input name="current" type="password" class="field" autocomplete="current-password" required></div>' : ''}
            <div><label class="label">Nowe hasło (min. 8 znaków)</label><input name="password" type="password" class="field" autocomplete="new-password" minlength="8" required></div>
            <button class="rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold">${me.has_password ? 'Zmień hasło' : 'Ustaw hasło'}</button></form>`)}
        </div>
      </div>`);
    P.$('#profile').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api('/api/me/profile', { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano profil');
      P.refreshMe();
    };
    P.$('#avatar').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      await P.guard(() => VS.upload('/api/me/avatar', f), 'Avatar zaktualizowany');
      await P.refreshMe(); P.views['account/settings']();
    };
    P.$('#pw').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api('/api/me/password', { method: 'POST', body: P.formData(e.target) }), 'Hasło zapisane');
      P.views['account/settings']();
    };
    P.$$('[data-unlink]').forEach((b) => b.onclick = async () => {
      await P.guard(() => api('/api/me/unlink/' + b.dataset.unlink, { method: 'POST' }), 'Konto odłączone');
      P.views['account/settings']();
    });
  };

  P.views['seller/join'] = async () => {
    P.render(`<div class="max-w-3xl">
      ${h.title('Zostań twórcą Velorie', 'Sprzedawaj pluginy, skrypty, mapy, interiory i mody — z licencjami i statystykami.')}
      <div class="grid sm:grid-cols-3 gap-4 mb-6">
        <div class="glass rounded-2xl p-5"><i data-lucide="percent" class="h-6 w-6 text-[var(--accent)]"></i><div class="font-bold mt-3">Tylko prowizja</div><p class="text-sm text-white/60 mt-1">Bez abonamentu i opłat za wystawienie.</p></div>
        <div class="glass rounded-2xl p-5"><i data-lucide="key-round" class="h-6 w-6 text-[var(--accent)]"></i><div class="font-bold mt-3">Licencje</div><p class="text-sm text-white/60 mt-1">Automatyczne klucze i API weryfikacji.</p></div>
        <div class="glass rounded-2xl p-5"><i data-lucide="chart-line" class="h-6 w-6 text-[var(--accent)]"></i><div class="font-bold mt-3">Statystyki</div><p class="text-sm text-white/60 mt-1">Przychody, konwersja, top produkty.</p></div>
      </div>
      ${h.card('Otwórz swój sklep', `<form id="join" class="space-y-4">
        <div><label class="label">Nazwa sklepu (widoczna dla klientów)</label><input name="store_name" class="field" placeholder="np. NovaDev Scripts" minlength="3" maxlength="40" required></div>
        <label class="flex items-start gap-2 text-sm text-white/65"><input type="checkbox" class="check mt-0.5" required>Oświadczam, że mam prawa do sprzedawanych treści i akceptuję regulamin dla twórców.</label>
        <button class="inline-flex items-center gap-2 rounded-2xl btn-primary px-5 py-3 text-sm font-semibold"><i data-lucide="rocket" class="h-4 w-4"></i>Otwórz sklep</button></form>`)}
    </div>`);
    P.$('#join').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api('/api/me/become-seller', { method: 'POST', body: P.formData(e.target) }), 'Twój sklep jest gotowy!');
      await P.refreshMe();
      location.hash = '#/seller/products/new';
    };
  };

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', () => {
    VS.layout({ footer: false });
    document.getElementById('side-toggle').onclick = () => document.getElementById('side').classList.toggle('hidden');
    VS.meReady.then((me) => {
      if (!me) return (location.href = '/auth.html?next=' + encodeURIComponent('/panel.html' + location.hash));
      sideNav();
      route();
      window.addEventListener('hashchange', route);
    });
  });
})();
