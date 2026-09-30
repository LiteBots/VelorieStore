/* Velorie Store — panel: router, komponenty, wykresy, widoki kupującego */
(function () {
  const { api, esc, fmt, toast, icon } = VS;
  const P = (window.Panel = { views: {}, cleanups: [] });

  // ================= Komponenty =================
  const h = (P.h = {
    head(title, sub = '', actions = '', back) {
      return `${back ? `<a href="${back[0]}" class="back">${icon('arrow-left', 'i-sm')}${back[1]}</a>` : ''}
        <div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="row gap-2 wrap">${actions}</div></div>`;
    },
    kpi(label, value, ic, { delta, hint } = {}) {
      const d = delta === undefined || delta === null ? '' :
        `<span class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}">${icon(delta >= 0 ? 'trend-up' : 'trend-down', 'i-xs')}${delta > 0 ? '+' : ''}${String(delta).replace('.', ',')}%</span>`;
      return `<div class="kpi"><div class="kpi-label"><span>${label}</span>${icon(ic)}</div>
        <div class="kpi-value">${value}</div>${d || hint ? `<div class="kpi-foot">${d}${hint ? `<span>${hint}</span>` : ''}</div>` : ''}</div>`;
    },
    card(title, body, { action = '', pad = true, cls = '' } = {}) {
      return `<section class="card ${cls}" style="overflow:hidden">${title ? `<div class="card-head"><h2>${title}</h2>${action}</div>` : ''}<div class="${pad ? 'card-body' : ''}">${body}</div></section>`;
    },
    empty(ic, title, text = '', cta = '') {
      return `<div class="empty"><span class="icon-box lg">${icon(ic, 'i-lg')}</span><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${cta ? `<div class="mt-6">${cta}</div>` : ''}</div>`;
    },
    status(s) {
      const m = {
        paid: ['badge-green', 'Opłacone'], pending: ['badge-amber', 'Oczekuje'], failed: ['badge-red', 'Nieudane'], refunded: ['', 'Zwrócone'],
        active: ['badge-green', 'Aktywna'], revoked: ['badge-red', 'Unieważniona'], published: ['badge-green', 'Opublikowany'], draft: ['', 'Szkic'],
        blocked: ['badge-red', 'Zablokowany'], rejected: ['badge-red', 'Odrzucona'], payout_paid: ['badge-green', 'Wypłacona'],
      }[s] || ['', s];
      return `<span class="badge ${m[0]}"><span class="dot"></span>${m[1]}</span>`;
    },
    btn(label, ic, attrs = '', kind = 'btn-secondary') {
      return `<button ${attrs} class="btn ${kind}">${ic ? icon(ic, 'i-md') : ''}${label}</button>`;
    },
    search(id, placeholder, w = 260) {
      return `<div class="input-icon" style="width:${w}px;max-width:100%">${icon('search', 'i-md')}<input id="${id}" class="input" placeholder="${placeholder}" autocomplete="off"></div>`;
    },
    seg(items, active, attr) {
      return `<div class="seg">${items.map(([v, l]) => `<button ${attr}="${v}" class="${String(v) === String(active) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    },
  });

  P.render = (html) => {
    P.cleanups.forEach((f) => f()); P.cleanups = [];
    const v = document.getElementById('view');
    v.innerHTML = html;
    VS.icons(v);
  };
  P.$ = (s) => document.querySelector('#view ' + s);
  P.$$ = (s) => [...document.querySelectorAll('#view ' + s)];
  P.formData = (form) => Object.fromEntries([...form.elements].filter((e) => e.name).map((e) => [e.name, e.type === 'checkbox' ? e.checked : e.value]));
  P.guard = async (fn, okMsg) => {
    try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; }
    catch (e) { toast(e.message, 'err'); throw e; }
  };
  P.busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.style.opacity = on ? '.7' : ''; };

  // ================= Wykresy SVG =================
  function niceMax(v) {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / exp;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  }
  P.chart = function chart(el, { labels, values, color = '#ff0354', type = 'line', height = 260, yFormat = (v) => v, tip }) {
    const draw = () => {
      const W = el.clientWidth || 600, H = height;
      const pad = { l: 52, r: 8, t: 12, b: 28 };
      const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      const max = niceMax(Math.max(...values, 0) * 1.08);
      const n = values.length;
      const x = (i) => pad.l + (type === 'bar' ? (iw / n) * (i + 0.5) : n > 1 ? (iw * i) / (n - 1) : iw / 2);
      const y = (v) => pad.t + ih - (v / max) * ih;
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
      const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 90))));
      const gid = 'g' + Math.random().toString(36).slice(2, 8);
      let marks = '';
      if (type === 'line') {
        const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        marks = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
          <path d="M${pts[0]} L${pts.join(' L')} L${x(n - 1)},${pad.t + ih} L${x(0)},${pad.t + ih}Z" fill="url(#${gid})"/>
          <path d="M${pts.join(' L')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      } else {
        const bw = Math.max(2, Math.min(28, (iw / n) * 0.62));
        marks = values.map((v, i) => {
          const bh = Math.max(v > 0 ? 2 : 0, (v / max) * ih);
          const bx = x(i) - bw / 2, by = pad.t + ih - bh, r = Math.min(4, bw / 2, bh);
          return bh ? `<path data-bar="${i}" d="M${bx},${by + bh} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - r} Q${bx + bw},${by} ${bx + bw},${by + r} V${by + bh} Z" fill="${color}" opacity=".9"/>` : '';
        }).join('');
      }
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
        ${ticks.map((t) => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-text" x="${pad.l - 10}" y="${y(t) + 4}" text-anchor="end">${yFormat(t)}</text>`).join('')}
        ${labels.map((l, i) => (i % step === 0 ? `<text class="axis-text" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>` : '')).join('')}
        ${marks}
        <line class="crosshair" id="${gid}-x" y1="${pad.t}" y2="${pad.t + ih}" style="display:none"/>
        ${type === 'line' ? `<circle id="${gid}-d" r="4.5" fill="${color}" stroke="#07080d" stroke-width="2.5" style="display:none"/>` : ''}
        <rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent" id="${gid}-hit"/>
      </svg><div class="chart-tip" style="display:none"></div>`;
      const hit = el.querySelector(`#${gid}-hit`), cx = el.querySelector(`#${gid}-x`), dot = el.querySelector(`#${gid}-d`), tipEl = el.querySelector('.chart-tip');
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left;
        let i = type === 'bar' ? Math.floor(((mx - pad.l) / iw) * n) : Math.round(((mx - pad.l) / iw) * (n - 1));
        i = Math.max(0, Math.min(n - 1, i));
        cx.setAttribute('x1', x(i)); cx.setAttribute('x2', x(i)); cx.style.display = type === 'bar' ? 'none' : '';
        if (dot) { dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(values[i])); dot.style.display = ''; }
        el.querySelectorAll('[data-bar]').forEach((b) => b.setAttribute('opacity', b.dataset.bar == i ? '1' : '.45'));
        tipEl.innerHTML = tip ? tip(i) : `<b>${esc(labels[i])}</b>${yFormat(values[i])}`;
        tipEl.style.display = '';
        tipEl.style.left = Math.min(Math.max(x(i), 80), W - 80) + 'px';
        tipEl.style.top = y(values[i]) - 12 + 'px';
      };
      const leave = () => { cx.style.display = 'none'; if (dot) dot.style.display = 'none'; tipEl.style.display = 'none'; el.querySelectorAll('[data-bar]').forEach((b) => b.setAttribute('opacity', '.9')); };
      hit.addEventListener('mousemove', move); hit.addEventListener('mouseleave', leave);
    };
    el.classList.add('chart'); el.style.height = height + 'px';
    draw();
    let t; const onResize = () => { clearTimeout(t); t = setTimeout(draw, 120); };
    window.addEventListener('resize', onResize);
    P.cleanups.push(() => window.removeEventListener('resize', onResize));
  };

  // ================= Nawigacja =================
  function sideNav() {
    const me = VS.me;
    const link = (hash, ic, label, badge = '') => `<a href="#/${hash}" data-hash="${hash}" class="side-link">${icon(ic)}${label}${badge}</a>`;
    let html = `<div class="side-user">${VS.avatar(me, 'avatar-lg')}<div class="grow" style="min-width:0"><div class="strong small truncate">${esc(me.username)}</div>
        <div class="xs subtle truncate">${me.is_seller ? esc(me.store_name) : 'Konto klienta'}</div></div></div>
      <div class="side-group"><div class="side-title">Konto</div>
        ${link('account/overview', 'grid', 'Przegląd')}
        ${link('account/library', 'library', 'Biblioteka')}
        ${link('account/licenses', 'key', 'Licencje')}
        ${link('account/orders', 'receipt', 'Transakcje')}
        ${link('account/wishlist', 'heart', 'Lista życzeń')}
        ${link('account/settings', 'settings', 'Ustawienia')}
      </div>`;
    html += `<div class="side-group"><div class="side-title">Twórca</div>`;
    if (me.is_seller) {
      html += `${link('seller/stats', 'chart', 'Statystyki')}
        ${link('seller/products', 'package', 'Produkty')}
        ${link('seller/sales', 'bag', 'Sprzedaż')}
        ${link('seller/licenses', 'shield-check', 'Licencje klientów')}
        ${link('seller/coupons', 'ticket', 'Kody rabatowe')}
        ${link('seller/reviews', 'star', 'Recenzje')}
        ${link('seller/payouts', 'wallet', 'Wypłaty')}
        ${link('seller/store', 'store', 'Sklep')}`;
    } else {
      html += link('seller/join', 'rocket', 'Zacznij sprzedawać', '<span class="badge badge-brand">Nowe</span>');
    }
    html += '</div>';
    if (me.is_admin) {
      html += `<div class="side-group"><div class="side-title">Administracja</div>
        ${link('admin/overview', 'shield', 'Platforma')}
        ${link('admin/products', 'layers', 'Moderacja')}
        ${link('admin/users', 'users', 'Użytkownicy')}
        ${link('admin/payouts', 'banknote', 'Wypłaty twórców')}
        ${link('admin/infobar', 'megaphone', 'Komunikat')}</div>`;
    }
    html += `<div class="side-group"><a href="/sklep.html" class="side-link">${icon('store')}Wróć do sklepu</a></div>`;
    document.getElementById('side').innerHTML = html;
  }

  function highlight(key) {
    let label = 'Menu';
    document.querySelectorAll('#side [data-hash]').forEach((a) => {
      const on = key === a.dataset.hash;
      a.classList.toggle('active', on);
      if (on) label = a.textContent.trim();
    });
    document.getElementById('side-current').textContent = label;
  }

  async function route() {
    const raw = (location.hash.replace(/^#\/?/, '') || 'account/overview').split('?')[0];
    const parts = raw.split('/');
    let key = parts.slice(0, 2).join('/');
    const arg = parts[2];
    const me = VS.me;
    if (parts[0] === 'seller' && !me.is_seller) key = 'seller/join';
    if (parts[0] === 'admin' && !me.is_admin) key = 'account/overview';
    if (key === 'seller/join' && me.is_seller) key = 'seller/stats';
    const view = P.views[key] || P.views['account/overview'];
    highlight(P.views[key] ? key : 'account/overview');
    document.getElementById('side').classList.remove('open');
    document.getElementById('view').innerHTML = '<div class="skeleton" style="height:120px"></div><div class="skeleton mt-4" style="height:360px"></div>';
    try { await view(arg); }
    catch (e) {
      if (e.status === 401) return (location.href = '/auth.html?next=' + encodeURIComponent('/panel.html' + location.hash));
      P.render(`<div class="card">${h.empty('alert', 'Coś poszło nie tak', esc(e.message))}</div>`);
    }
    const qs = new URLSearchParams(location.hash.split('?')[1] || '');
    if (qs.get('error')) toast(qs.get('error'), 'err');
    window.scrollTo({ top: 0 });
  }
  P.route = route;
  P.refreshMe = async () => { const d = await api('/api/auth/me'); VS.setMe(d.user); sideNav(); highlight((location.hash.replace(/^#\/?/, '') || '').split('/').slice(0, 2).join('/')); };

  // ================= KUPUJĄCY =================
  P.views['account/overview'] = async () => {
    const d = await api('/api/me/overview');
    const s = d.stats;
    const hour = new Date().getHours();
    P.render(`
      ${h.head(`${hour < 18 ? 'Dzień dobry' : 'Dobry wieczór'}, ${esc(VS.me.username)}`, 'Twoje zakupy, licencje i aktualizacje w jednym miejscu.', `<a href="/sklep.html" class="btn btn-secondary">${icon('store', 'i-md')}Przeglądaj sklep</a>`)}
      <div class="kpis">
        ${h.kpi('Produkty w bibliotece', fmt.num(s.licenses), 'library')}
        ${h.kpi('Aktywne serwery', fmt.num(s.activations), 'server')}
        ${h.kpi('Zamówienia', fmt.num(s.orders), 'receipt')}
        ${h.kpi('Wydano łącznie', fmt.money(s.spent), 'wallet', { hint: s.saved ? `zaoszczędzono ${fmt.money(s.saved)}` : '' })}
      </div>
      <div class="two-col mt-6">
        ${h.card('Ostatnie zamówienia', d.recent_orders.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Numer</th><th>Data</th><th>Pozycje</th><th class="num">Kwota</th><th>Status</th></tr></thead><tbody>
          ${d.recent_orders.map((o) => `<tr><td class="mono small strong">${esc(o.number)}</td><td>${fmt.date(o.created_at)}</td><td>${o.items}</td><td class="num strong">${fmt.money(o.total)}</td><td>${h.status(o.status)}</td></tr>`).join('')}
          </tbody></table></div>` : h.empty('bag', 'Brak zamówień', 'Twoje zakupy pojawią się tutaj.', '<a href="/sklep.html" class="btn btn-primary">Przeglądaj sklep</a>'),
          { pad: false, action: '<a href="#/account/orders" class="link-brand small">Wszystkie</a>' })}
        ${h.card('Aktualizacje produktów', d.updates.length ? d.updates.map((u) => `
          <a href="/produkt/${esc(u.slug)}" class="list-item" style="align-items:flex-start">
            <span class="icon-box sm violet">${icon('branch', 'i-sm')}</span>
            <div class="grow"><div class="row between gap-2"><span class="strong small truncate">${esc(u.title)}</span><span class="badge badge-violet mono">v${esc(u.version)}</span></div>
              <div class="xs subtle mt-1">${fmt.rel(u.created_at)}</div></div>
          </a>`).join('') : h.empty('bell', 'Brak aktualizacji'), { pad: false })}
      </div>
      ${VS.me.is_seller ? '' : `<div class="cta mt-6" style="padding:36px;text-align:left">
        <div class="row between wrap gap-6"><div><h2 class="h3">Tworzysz pluginy, skrypty albo mapy?</h2><p class="muted mt-2">Otwórz sklep twórcy i sprzedawaj z licencjami, statystykami i wypłatami.</p></div>
        <a href="#/seller/join" class="btn btn-primary btn-lg">${icon('rocket', 'i-md')}Zacznij sprzedawać</a></div></div>`}`);
  };

  P.views['account/library'] = async () => {
    const items = await api('/api/me/library');
    const draw = (f = '') => {
      const list = items.filter((i) => (i.title + i.store_name).toLowerCase().includes(f.toLowerCase()));
      P.$('#lib').innerHTML = list.length ? list.map((i) => `
        <article class="lib-card">
          <a href="/produkt/${esc(i.slug)}"><img src="${esc(i.cover_url || '')}" alt=""></a>
          <div class="card-pad col gap-4" style="padding:20px">
            <div class="row between gap-4 wrap">
              <div style="min-width:0"><a href="/produkt/${esc(i.slug)}" class="h4 clamp-1">${esc(i.title)}</a>
                <div class="xs subtle mt-1">${esc(i.store_name)} · <span class="mono">v${esc(i.version)}</span> · kupiono ${fmt.date(i.acquired_at)}</div></div>
              <div class="row gap-2">
                <a href="/api/products/${i.id}/download" class="btn btn-primary ${i.license_status === 'revoked' ? 'is-disabled' : ''}">${icon('download', 'i-md')}Pobierz</a>
                <a href="/produkt/${esc(i.slug)}#recenzje" class="btn btn-secondary btn-icon" title="${i.my_rating ? 'Twoja ocena: ' + i.my_rating + '/5' : 'Oceń produkt'}" style="${i.my_rating ? 'color:#fbbf24' : ''}">${icon('star', 'i-md' + (i.my_rating ? ' i-fill' : ''))}</a>
              </div>
            </div>
            ${i.license_enabled ? `<div class="row gap-3 wrap">
              <button class="keybox grow" style="max-width:420px" data-copy="${esc(i.license_key)}" title="Kopiuj klucz">${icon('key', 'i-md')}<span>${esc(i.license_key)}</span>${icon('copy', 'i-sm')}</button>
              <div class="row gap-2 small">${h.status(i.license_status)}<span class="subtle">Serwery <b class="num" style="color:var(--text)">${i.activations}/${i.max_activations || '∞'}</b></span></div>
              ${i.activations ? `<button data-reset="${i.license_id}" class="btn btn-ghost btn-sm">${icon('refresh', 'i-sm')}Resetuj</button>` : ''}
            </div>` : '<div class="xs subtle">Ten produkt nie wymaga klucza licencji.</div>'}
          </div>
        </article>`).join('')
        : `<div class="card">${h.empty('library', f ? 'Brak wyników' : 'Biblioteka jest pusta', f ? 'Spróbuj innej frazy.' : 'Kupione produkty pojawią się tutaj razem z kluczami licencji.', f ? '' : '<a href="/sklep.html" class="btn btn-primary">Przeglądaj sklep</a>')}</div>`;
      P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy, 'Skopiowano klucz licencji'));
      P.$$('[data-reset]').forEach((b) => b.onclick = async () => {
        if (!(await VS.confirm('Zresetować aktywacje licencji?', { ok: 'Resetuj', desc: 'Wszystkie serwery będą musiały aktywować klucz ponownie.' }))) return;
        await P.guard(() => api(`/api/me/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane');
        P.views['account/library']();
      });
    };
    P.render(`${h.head('Biblioteka', `${items.length} ${fmt.plural(items.length, 'produkt', 'produkty', 'produktów')} · pobieraj pliki i zarządzaj kluczami`, h.search('lib-q', 'Szukaj w bibliotece'))}
      <div id="lib" class="stack"></div>`);
    P.$('#lib-q').oninput = (e) => draw(e.target.value);
    draw();
  };

  P.views['account/licenses'] = async () => {
    const list = await api('/api/me/licenses');
    P.render(`${h.head('Licencje', 'Każdy serwer, na którym uruchomisz produkt, zajmuje jedną aktywację. Zwolnij stare przy zmianie hostingu.', `<a href="/docs.html" class="btn btn-secondary">${icon('book', 'i-md')}Jak to działa</a>`)}
      <div class="stack">${list.length ? list.map((l) => `
        <section class="card" style="overflow:hidden">
          <div class="card-head" style="flex-wrap:wrap">
            <div class="row gap-3" style="min-width:0">
              <img src="${esc(l.cover_url || '')}" class="table-thumb" alt="">
              <div style="min-width:0"><a href="/produkt/${esc(l.slug)}" class="strong truncate">${esc(l.title)}</a><div class="xs subtle">Wydana ${fmt.date(l.created_at)}</div></div>
            </div>
            <div class="row gap-3 wrap">${h.status(l.status)}
              <button class="keybox" style="width:auto" data-copy="${esc(l.license_key)}">${icon('key', 'i-sm')}<span>${esc(l.license_key)}</span>${icon('copy', 'i-sm')}</button></div>
          </div>
          <div class="row between wrap gap-3" style="padding:12px 20px;border-bottom:1px solid var(--line)">
            <div class="row gap-3 small"><span class="subtle">Wykorzystane aktywacje</span><div class="progress" style="width:140px"><div style="width:${l.max_activations ? Math.min(100, (l.activations.length / l.max_activations) * 100) : 8}%"></div></div><span class="strong num">${l.activations.length} / ${l.max_activations || '∞'}</span></div>
            ${l.activations.length ? `<button data-reset="${l.id}" class="btn btn-ghost btn-sm">${icon('refresh', 'i-sm')}Resetuj wszystkie</button>` : ''}
          </div>
          ${l.activations.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Serwer</th><th>IP</th><th>Aktywowano</th><th>Ostatnio online</th><th></th></tr></thead><tbody>
            ${l.activations.map((a) => `<tr><td class="mono small strong">${esc(a.identifier)}</td><td class="mono small">${esc(a.ip || '—')}</td><td>${fmt.date(a.first_seen)}</td><td>${fmt.rel(a.last_seen)}</td>
              <td class="text-right"><button data-deact="${l.id}/${a.id}" class="btn btn-ghost btn-sm">${icon('unplug', 'i-sm')}Zwolnij</button></td></tr>`).join('')}
            </tbody></table></div>` : `<p class="small subtle" style="padding:16px 20px">Brak aktywnych serwerów — klucz aktywuje się przy pierwszym uruchomieniu zasobu.</p>`}
        </section>`).join('') : `<div class="card">${h.empty('key', 'Brak licencji', 'Klucze pojawią się po pierwszym zakupie.')}</div>`}</div>`);
    P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy, 'Skopiowano klucz licencji'));
    P.$$('[data-reset]').forEach((b) => b.onclick = async () => {
      if (!(await VS.confirm('Zresetować wszystkie aktywacje?', { ok: 'Resetuj' }))) return;
      await P.guard(() => api(`/api/me/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane');
      P.views['account/licenses']();
    });
    P.$$('[data-deact]').forEach((b) => b.onclick = async () => {
      const [lid, aid] = b.dataset.deact.split('/');
      await P.guard(() => api(`/api/me/licenses/${lid}/activations/${aid}`, { method: 'DELETE' }), 'Serwer odłączony');
      P.views['account/licenses']();
    });
  };

  P.views['account/orders'] = async () => {
    const orders = await api('/api/me/orders');
    const spent = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + o.total, 0);
    P.render(`${h.head('Transakcje', `${orders.length} ${fmt.plural(orders.length, 'zamówienie', 'zamówienia', 'zamówień')} · łącznie ${fmt.money(spent)}`)}
      ${orders.length ? `<div class="card" style="overflow:hidden"><div class="table-wrap"><table class="table">
        <thead><tr><th style="width:36px"></th><th>Numer</th><th>Data</th><th>Produkty</th><th class="num">Rabat</th><th class="num">Kwota</th><th>Status</th></tr></thead><tbody>
        ${orders.map((o) => `<tr style="cursor:pointer" data-toggle="${o.id}">
          <td>${icon('chevron-right', 'i-sm subtle')}</td>
          <td class="mono small strong nowrap">${esc(o.number)}</td><td class="nowrap">${fmt.datetime(o.created_at)}</td>
          <td style="max-width:280px"><span class="truncate" style="display:block">${esc(o.items.map((i) => i.title).join(', '))}</span></td>
          <td class="num c-green">${o.discount ? '−' + fmt.money(o.discount) : '<span class="faint">—</span>'}</td>
          <td class="num strong nowrap">${fmt.money(o.total)}</td><td>${h.status(o.status)}</td></tr>
          <tr hidden data-detail="${o.id}"><td colspan="7" style="background:var(--bg-2);padding:12px 16px">
            ${o.items.map((i) => `<div class="row gap-3" style="padding:8px 0"><img src="${esc(i.cover_url || '')}" class="table-thumb" alt="">
              <div class="grow"><a href="/produkt/${esc(i.slug)}" class="strong small">${esc(i.title)}</a><div class="xs subtle">${fmt.money(i.price - i.discount)}${i.discount ? ` · <s>${fmt.money(i.price)}</s>` : ''}</div></div>
              ${o.status === 'paid' ? `<a href="/api/products/${i.product_id}/download" class="btn btn-secondary btn-sm">${icon('download', 'i-sm')}Pobierz</a>` : ''}</div>`).join('')}
            <div class="xs subtle mt-2">Metoda: ${esc(o.provider || '—')}${o.coupon_code ? ` · kod <b>${esc(o.coupon_code)}</b>` : ''}</div>
          </td></tr>`).join('')}
        </tbody></table></div></div>` : `<div class="card">${h.empty('receipt', 'Brak transakcji')}</div>`}`);
    P.$$('[data-toggle]').forEach((r) => r.onclick = () => {
      const d = P.$(`[data-detail="${r.dataset.toggle}"]`);
      d.hidden = !d.hidden;
      r.querySelector('svg').style.transform = d.hidden ? '' : 'rotate(90deg)';
    });
  };

  P.views['account/wishlist'] = async () => {
    const list = await api('/api/me/wishlist');
    P.render(`${h.head('Lista życzeń', 'Produkty zapisane na później.')}
      ${list.length ? `<div class="grid g-cards">${list.map((p) => `<div class="relative">${VS.productCard(p)}
        <button data-unwish="${p.id}" class="pcard-wish on" style="opacity:1" title="Usuń z listy">${icon('heart', 'i-md')}</button></div>`).join('')}</div>`
        : `<div class="card">${h.empty('heart', 'Lista życzeń jest pusta', 'Kliknij serduszko na stronie produktu, aby go zapisać.', '<a href="/sklep.html" class="btn btn-primary">Przeglądaj sklep</a>')}</div>`}`);
    VS.reveal();
    P.$$('[data-unwish]').forEach((b) => b.onclick = async () => { await api('/api/me/wishlist/' + b.dataset.unwish, { method: 'DELETE' }); P.views['account/wishlist'](); });
  };

  P.views['account/settings'] = async () => {
    await P.refreshMe();
    const me = VS.me;
    const prov = await api('/api/auth/providers');
    const conn = (key, name, ic, connected, detail) => `
      <div class="list-item">
        <span class="icon-box" style="${key === 'discord' ? 'background:#5865f2;border-color:transparent;color:#fff' : ''}">${icon(ic, 'i-md')}</span>
        <div class="grow"><div class="strong small">${name}</div><div class="xs subtle">${connected ? 'Połączono' + (detail ? ' · ' + esc(detail) : '') : prov[key] ? 'Niepołączone' : 'Wymaga konfiguracji OAuth na serwerze'}</div></div>
        ${connected ? `<button data-unlink="${key}" class="btn btn-secondary btn-sm">Odłącz</button>`
          : prov[key] ? `<a href="/auth/${key}?link=1&next=${encodeURIComponent('/panel.html#/account/settings')}" class="btn btn-primary btn-sm">Połącz</a>` : '<span class="badge">Niedostępne</span>'}
      </div>`;
    P.render(`${h.head('Ustawienia konta', 'Profil, metody logowania i bezpieczeństwo.')}
      <div class="half">
        ${h.card('Profil', `<form id="profile" class="stack">
          <div class="row gap-4">${VS.avatar(me, 'avatar-xl')}
            <div><label class="btn btn-secondary btn-sm">${icon('upload', 'i-sm')}Zmień zdjęcie<input type="file" id="avatar" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label><div class="hint">PNG, JPG lub WEBP do 2 MB</div></div></div>
          <div><label class="label">Nazwa użytkownika</label><input name="username" class="input" value="${esc(me.username)}" maxlength="32"></div>
          <div><label class="label">O mnie <span class="opt">(opcjonalnie)</span></label><textarea name="bio" rows="3" class="textarea" maxlength="500">${esc(me.bio || '')}</textarea></div>
          <div><label class="label">E-mail</label><input class="input" value="${esc(me.email || 'Brak — konto założone przez Discord/Google')}" disabled></div>
          <div class="row end"><button class="btn btn-primary">Zapisz zmiany</button></div></form>`)}
        <div class="stack">
          ${h.card('Metody logowania', `${conn('google', 'Google', 'google', me.google)}${conn('discord', 'Discord', 'discord', me.discord, me.discord_username)}
            <div class="list-item"><span class="icon-box">${icon('mail', 'i-md')}</span><div class="grow"><div class="strong small">E-mail i hasło</div><div class="xs subtle">${me.has_password ? 'Ustawione' : 'Nie ustawiono hasła'}</div></div>${me.has_password ? '<span class="badge badge-green"><span class="dot"></span>Aktywne</span>' : ''}</div>`, { pad: false })}
          ${h.card(me.has_password ? 'Zmień hasło' : 'Ustaw hasło', `<form id="pw" class="stack">
            ${!me.email ? '<div><label class="label">E-mail do logowania</label><input name="email" type="email" class="input" required></div>' : ''}
            ${me.has_password ? '<div><label class="label">Obecne hasło</label><input name="current" type="password" class="input" autocomplete="current-password" required></div>' : ''}
            <div><label class="label">Nowe hasło</label><input name="password" type="password" class="input" autocomplete="new-password" minlength="8" required><div class="hint">Minimum 8 znaków.</div></div>
            <div class="row end"><button class="btn btn-secondary">${me.has_password ? 'Zmień hasło' : 'Ustaw hasło'}</button></div></form>`)}
        </div>
      </div>`);
    P.$('#profile').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/me/profile', { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano profil'); P.refreshMe(); };
    P.$('#avatar').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; await P.guard(() => VS.upload('/api/me/avatar', f), 'Zdjęcie zaktualizowane'); P.views['account/settings'](); };
    P.$('#pw').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/me/password', { method: 'POST', body: P.formData(e.target) }), 'Hasło zapisane'); P.views['account/settings'](); };
    P.$$('[data-unlink]').forEach((b) => b.onclick = async () => { await P.guard(() => api('/api/me/unlink/' + b.dataset.unlink, { method: 'POST' }), 'Konto odłączone'); P.views['account/settings'](); });
  };

  P.views['seller/join'] = async () => {
    P.render(`<div style="max-width:760px">
      ${h.head('Zacznij sprzedawać na Velorie', 'Pluginy, skrypty, mapy, interiory i mody — z licencjami, statystykami i wypłatami.')}
      <div class="grid g-3 mb-6">
        <div class="feature"><span class="icon-box brand">${icon('percent')}</span><h3>Tylko prowizja</h3><p>Bez abonamentu i opłat za wystawienie.</p></div>
        <div class="feature"><span class="icon-box brand">${icon('key')}</span><h3>Licencje</h3><p>Automatyczne klucze i API weryfikacji.</p></div>
        <div class="feature"><span class="icon-box brand">${icon('chart')}</span><h3>Statystyki</h3><p>Przychody, konwersja, top produkty.</p></div>
      </div>
      ${h.card('Utwórz sklep', `<form id="join" class="stack">
        <div><label class="label">Nazwa sklepu</label><input name="store_name" class="input input-lg" placeholder="np. NovaDev Scripts" minlength="3" maxlength="40" required><div class="hint">Widoczna dla klientów. Możesz ją później zmienić.</div></div>
        <label class="check small"><input type="checkbox" required><span>Oświadczam, że mam prawa do sprzedawanych treści i akceptuję <a class="link" href="/regulamin.html" target="_blank">regulamin dla twórców</a>.</span></label>
        <div class="row end"><button class="btn btn-primary btn-lg">${icon('rocket', 'i-md')}Otwórz sklep</button></div></form>`)}
    </div>`);
    P.$('#join').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api('/api/me/become-seller', { method: 'POST', body: P.formData(e.target) }), 'Twój sklep jest gotowy!');
      await P.refreshMe();
      location.hash = '#/seller/products/new';
    };
  };

  // ================= Start =================
  document.addEventListener('DOMContentLoaded', () => {
    VS.layout({ footer: false, app: true });
    document.getElementById('side-toggle').onclick = () => document.getElementById('side').classList.toggle('open');
    VS.meReady.then((me) => {
      if (!me) return (location.href = '/auth.html?next=' + encodeURIComponent('/panel.html' + location.hash));
      sideNav();
      route();
      window.addEventListener('hashchange', route);
    });
  });
})();
