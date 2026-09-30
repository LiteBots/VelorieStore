/* Velorie Store — panel twórcy (klient biznesowy) */
(function () {
  const { api, esc, fmt, toast, icon } = VS;
  const P = window.Panel;
  const h = P.h;
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch {} return null; };

  // ================= STATYSTYKI =================
  P.views['seller/stats'] = async () => {
    const days = Number(store('vs_days') || 30);
    const d = await api('/api/seller/stats?days=' + days);
    const k = d.kpi;
    const zl = (v) => (v >= 1000 ? (v / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' tys.' : Math.round(v).toLocaleString('pl-PL')) + ' zł';
    const maxTop = d.top_products[0] ? d.top_products[0].revenue : 1;
    const catTotal = d.categories.reduce((s, c) => s + c.revenue, 0) || 1;

    P.render(`
      ${h.head('Statystyki', `${esc(VS.me.store_name)} · porównanie z poprzednimi ${d.days} dniami`,
        `${h.seg([[7, '7 dni'], [30, '30 dni'], [90, '90 dni'], [365, '12 mies.']], d.days, 'data-days')}
         <a href="/tworca/${esc(VS.me.store_slug)}" target="_blank" class="btn btn-secondary">${icon('external', 'i-md')}Mój sklep</a>`)}
      <div class="kpis">
        ${h.kpi('Przychód brutto', fmt.money(k.revenue), 'banknote', { delta: k.revenue_delta })}
        ${h.kpi('Zarobek netto', fmt.money(k.net), 'wallet', { delta: k.net_delta, hint: `po prowizji ${d.fee_percent}%` })}
        ${h.kpi('Sprzedaże', fmt.num(k.sales), 'bag', { delta: k.sales_delta, hint: `${k.buyers} ${fmt.plural(k.buyers, 'klient', 'klientów', 'klientów')}` })}
        ${h.kpi('Średnia wartość', fmt.money(k.avg_order), 'receipt', { hint: `konwersja ${String(k.conversion).replace('.', ',')}%` })}
      </div>

      <div class="two-col mt-6">
        <section class="card" style="overflow:hidden">
          <div class="card-head"><h2>Przychód</h2>${h.seg([['revenue', 'Brutto'], ['net', 'Netto'], ['sales', 'Sprzedaże']], 'revenue', 'data-metric')}</div>
          <div class="card-body" style="padding:16px 16px 8px"><div id="ch-main"></div></div>
        </section>
        <div class="stack">
          <section class="card card-pad card-glow">
            <div class="row between"><span class="small subtle">Dostępne do wypłaty</span>${icon('wallet', 'i-md subtle')}</div>
            <div class="kpi-value" style="font-size:32px">${fmt.money(d.balance.available)}</div>
            <div class="xs subtle mt-2">Zarobione łącznie ${fmt.money(d.balance.earned)} · wypłacone ${fmt.money(d.balance.paid_out)}</div>
            <a href="#/seller/payouts" class="btn btn-primary btn-block mt-6">${icon('download', 'i-md')}Wypłać środki</a>
          </section>
          ${h.card('Podsumowanie', `<dl class="spec" style="margin-top:-12px">
            <div style="border-top:0"><dt>Produkty</dt><dd class="num">${d.totals.published} <span class="subtle">/ ${d.totals.products}</span></dd></div>
            <div style="border-top:0"><dt>Sprzedaże łącznie</dt><dd class="num">${fmt.num(d.totals.all_sales)}</dd></div>
            <div><dt>Wyświetlenia</dt><dd class="num">${fmt.num(d.totals.views)}</dd></div>
            <div><dt>Pobrania</dt><dd class="num">${fmt.num(d.totals.downloads)}</dd></div>
            <div><dt>Aktywne licencje</dt><dd class="num">${fmt.num(d.totals.licenses)}</dd></div>
            <div><dt>Serwery online (7 dni)</dt><dd class="num">${fmt.num(d.totals.active_servers)}</dd></div>
            <div style="grid-column:1/-1"><dt>Średnia ocen</dt><dd class="row gap-2">${VS.stars(d.totals.rating)}<span class="num">${d.totals.rating ? Number(d.totals.rating).toFixed(2) : '–'}</span><span class="subtle xs">(${d.totals.reviews})</span></dd></div>
          </dl>`)}
        </div>
      </div>

      <div class="half mt-6">
        ${h.card('Najlepsze produkty', d.top_products.length ? d.top_products.map((t) => `
          <div class="hbar"><span class="strong truncate">${esc(t.title)}</span><span class="num subtle">${t.sales} szt. · <b style="color:var(--text)">${fmt.money(t.revenue)}</b></span>
            <div class="track"><div class="fill" style="width:${(t.revenue / maxTop) * 100}%"></div></div></div>`).join('') : h.empty('bar-chart', 'Brak sprzedaży w tym okresie'))}
        ${h.card('Przychód według kategorii', d.categories.length ? d.categories.map((c) => `
          <div class="hbar"><span class="row gap-2">${icon(VS.catIcon(c.id), 'i-sm subtle')}<span class="strong">${esc(c.name)}</span></span><span class="num subtle">${Math.round((c.revenue / catTotal) * 100)}% · <b style="color:var(--text)">${fmt.money(c.revenue)}</b></span>
            <div class="track"><div class="fill" style="width:${(c.revenue / catTotal) * 100}%;background:#8b5cf6"></div></div></div>`).join('') : h.empty('layers', 'Brak danych'))}
      </div>

      <div class="mt-6">${h.card('Ostatnie sprzedaże', d.recent_sales.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Produkt</th><th>Klient</th><th>Kiedy</th><th class="num">Cena</th><th class="num">Netto</th></tr></thead><tbody>
        ${d.recent_sales.map((s) => `<tr><td class="strong">${esc(s.title)}</td><td><span class="row gap-2">${VS.avatar({ username: s.username }, 'avatar-sm')}${esc(s.username)}</span></td><td class="nowrap">${fmt.rel(s.paid_at)}</td>
          <td class="num nowrap">${fmt.money(s.price - s.discount)}</td><td class="num nowrap c-green">+${fmt.money(s.net)}</td></tr>`).join('')}
        </tbody></table></div>` : h.empty('bag', 'Brak sprzedaży'), { pad: false, action: '<a href="#/seller/sales" class="link-brand small">Pełna historia</a>' })}</div>`);

    P.$$('[data-days]').forEach((b) => b.onclick = () => { store('vs_days', b.dataset.days); P.views['seller/stats'](); });

    const labels = d.series.map((s) => new Date(s.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }));
    const drawMain = (metric) => {
      const conf = {
        revenue: { values: d.series.map((s) => s.revenue / 100), color: '#ff0354', type: 'line', fmt: zl },
        net: { values: d.series.map((s) => s.net / 100), color: '#34d399', type: 'line', fmt: zl },
        sales: { values: d.series.map((s) => s.sales), color: '#8b5cf6', type: 'bar', fmt: (v) => Math.round(v) },
      }[metric];
      P.chart(P.$('#ch-main'), {
        labels, values: conf.values, color: conf.color, type: conf.type, height: 280, yFormat: conf.fmt,
        tip: (i) => `<b>${new Date(d.series[i].date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })}</b>
          <div class="row"><span>Przychód</span><span class="strong">${fmt.money(d.series[i].revenue)}</span></div>
          <div class="row"><span>Netto</span><span class="strong">${fmt.money(d.series[i].net)}</span></div>
          <div class="row"><span>Sprzedaże</span><span class="strong">${d.series[i].sales}</span></div>`,
      });
    };
    P.$$('[data-metric]').forEach((b) => b.onclick = () => { P.$$('[data-metric]').forEach((x) => x.classList.toggle('on', x === b)); drawMain(b.dataset.metric); });
    drawMain('revenue');
  };

  // ================= PRODUKTY =================
  P.views['seller/products'] = async (arg) => {
    if (arg) return P.editor(arg);
    const list = await api('/api/seller/products');
    let filter = 'all';
    const draw = () => {
      const rows = list.filter((p) => filter === 'all' || p.status === filter);
      P.$('#rows').innerHTML = rows.length ? rows.map((p) => `<tr>
        <td><a href="#/seller/products/${p.id}" class="row gap-3" style="min-width:260px"><img src="${esc(p.cover_url || '')}" class="table-thumb" alt="">
          <span style="min-width:0"><span class="strong clamp-1">${esc(p.title)}</span><span class="xs subtle">${esc(VS.CAT_NAMES[p.category] || p.category)} · <span class="mono">v${esc(p.version)}</span></span></span></a></td>
        <td>${h.status(p.status)}</td>
        <td class="num nowrap">${fmt.price(p.price)}</td>
        <td class="num">${p.sales}</td>
        <td class="num nowrap strong">${fmt.money(p.revenue)}</td>
        <td class="nowrap">${p.rating ? `<span class="rating">${icon('star', 'i-sm')}${Number(p.rating).toFixed(1)}</span>` : '<span class="faint">—</span>'}</td>
        <td>${p.has_file ? `<span class="c-green row gap-1 small">${icon('check-circle', 'i-sm')}Jest</span>` : '<span class="badge badge-amber">Brak pliku</span>'}</td>
        <td class="mono small subtle">#${p.id}</td>
        <td class="text-right nowrap"><a href="#/seller/products/${p.id}" class="btn btn-ghost btn-sm btn-icon" title="Edytuj">${icon('pencil', 'i-sm')}</a><a href="/produkt/${esc(p.slug)}" target="_blank" class="btn btn-ghost btn-sm btn-icon" title="Podgląd">${icon('eye', 'i-sm')}</a></td>
      </tr>`).join('') : `<tr><td colspan="9">${h.empty('package', 'Brak produktów w tym widoku')}</td></tr>`;
    };
    const count = (s) => list.filter((p) => s === 'all' || p.status === s).length;
    P.render(`${h.head('Produkty', `${list.length} ${fmt.plural(list.length, 'produkt', 'produkty', 'produktów')} w sklepie`, `<a href="#/seller/products/new" class="btn btn-primary">${icon('plus', 'i-md')}Nowy produkt</a>`)}
      ${list.length ? `<section class="card" style="overflow:hidden">
        <div class="card-head">${h.seg([['all', `Wszystkie ${count('all')}`], ['published', `Opublikowane ${count('published')}`], ['draft', `Szkice ${count('draft')}`]], 'all', 'data-f')}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Produkt</th><th>Status</th><th class="num">Cena</th><th class="num">Sprzedaże</th><th class="num">Przychód</th><th>Ocena</th><th>Plik</th><th>ID</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
      </section>` : `<div class="card">${h.empty('package', 'Dodaj swój pierwszy produkt', 'Opis, cena, okładka i plik — i możesz zacząć sprzedawać.', '<a href="#/seller/products/new" class="btn btn-primary">Nowy produkt</a>')}</div>`}`);
    if (!list.length) return;
    P.$$('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; P.$$('[data-f]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    draw();
  };

  P.editor = async (id) => {
    const isNew = id === 'new';
    const cats = await VS.categories();
    const p = isNew ? { title: '', category: '', price: 0, summary: '', description: '', tags: [], version: '1.0.0', compatibility: '', license_enabled: true, max_activations: 1, status: 'draft', gallery: [], versions: [] }
      : await api('/api/seller/products/' + id);
    let group = '';
    const catOpts = cats.map((c) => { const g = c.group !== group ? `${group ? '</optgroup>' : ''}<optgroup label="${(group = c.group)}">` : ''; return `${g}<option value="${c.id}" ${c.id === p.category ? 'selected' : ''}>${esc(c.name)}</option>`; }).join('') + '</optgroup>';

    P.render(`
      ${h.head(isNew ? 'Nowy produkt' : esc(p.title), isNew ? 'Uzupełnij podstawowe dane — pliki dodasz w następnym kroku.' : `ID produktu do API licencji: <span class="mono strong" style="color:var(--text)">${p.id}</span>`,
        isNew ? '' : `${h.status(p.status)}<a href="/produkt/${esc(p.slug)}" target="_blank" class="btn btn-secondary">${icon('eye', 'i-md')}Podgląd</a>`, ['#/seller/products', 'Produkty'])}
      <div class="split-r">
        <form id="pf" class="stack">
          ${h.card('Informacje', `<div class="form-grid">
            <div class="full"><label class="label">Nazwa produktu</label><input name="title" class="input" value="${esc(p.title)}" maxlength="90" required placeholder="np. Advanced Garage System"></div>
            <div><label class="label">Kategoria</label><select name="category" class="select" required><option value="">Wybierz kategorię…</option>${catOpts}</select></div>
            <div><label class="label">Cena</label><div class="relative"><input name="price_pln" type="number" min="0" step="0.01" class="input" style="padding-right:40px" value="${(p.price / 100).toFixed(2)}"><span class="input-affix small subtle" style="right:12px">zł</span></div><div class="hint">0 zł = produkt darmowy</div></div>
            <div class="full"><label class="label">Krótki opis</label><input name="summary" class="input" value="${esc(p.summary)}" maxlength="200" placeholder="Jedno zdanie widoczne na kartach produktu"></div>
            <div class="full"><label class="label">Pełny opis</label><textarea name="description" rows="14" class="textarea mono" style="font-size:13px">${esc(p.description)}</textarea>
              <div class="hint">Formatowanie: <span class="mono">## Nagłówek</span>, <span class="mono">- lista</span>, <span class="mono">**pogrubienie**</span>, <span class="mono">\`kod\`</span></div></div>
            <div><label class="label">Kompatybilność</label><input name="compatibility" class="input" value="${esc(p.compatibility)}" placeholder="ESX • QBCore / Paper 1.20+"></div>
            <div><label class="label">Tagi</label><input name="tags" class="input" value="${esc(p.tags.join(', '))}" placeholder="garaż, esx, ui"></div>
            ${isNew ? `<div><label class="label">Wersja</label><input name="version" class="input mono" value="${esc(p.version)}" maxlength="20"></div>` : ''}
          </div>`)}
          ${h.card('Licencjonowanie', `<div class="stack">
            <label class="switch"><input name="license_enabled" type="checkbox" ${p.license_enabled ? 'checked' : ''}><span><span class="strong">Wymagaj klucza licencji</span><span class="block xs subtle" style="display:block">Kupujący otrzyma klucz VEL-…, który Twój kod sprawdza przez API.</span></span></label>
            <div style="max-width:280px"><label class="label">Limit serwerów na licencję</label><input name="max_activations" type="number" min="0" max="1000" class="input" value="${p.max_activations}"><div class="hint">0 = bez limitu</div></div>
            <a href="/docs.html#przyklady" target="_blank" class="link-brand small row gap-1">${icon('book', 'i-sm')}Kod integracji: Java, Lua, JS, Python</a>
          </div>`)}
          <div class="card card-pad-sm row between wrap gap-3" style="padding:14px 16px;position:sticky;bottom:12px;z-index:5;box-shadow:var(--shadow-lg)">
            <div class="row gap-3"><label class="small subtle" for="st">Widoczność</label>
              <select id="st" name="status" class="select" style="width:auto;height:36px"><option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Szkic — niewidoczny</option><option value="published" ${p.status === 'published' ? 'selected' : ''}>Opublikowany</option>${p.status === 'blocked' ? '<option value="blocked" selected>Zablokowany przez moderację</option>' : ''}</select></div>
            <div class="row gap-2">${isNew ? '' : `<button type="button" id="del" class="btn btn-danger">${icon('trash', 'i-md')}Usuń</button>`}
              <button class="btn btn-primary" id="save">${icon('save', 'i-md')}${isNew ? 'Utwórz produkt' : 'Zapisz zmiany'}</button></div>
          </div>
        </form>

        <div class="stack">
          ${isNew ? h.card('Pliki i media', `<p class="small muted">Okładkę, galerię i plik do pobrania dodasz po utworzeniu produktu.</p>`) : `
          ${h.card('Okładka', `<label class="dropzone" style="padding:0;overflow:hidden;aspect-ratio:16/10">
              ${p.cover_url ? `<img src="${esc(p.cover_url)}" style="width:100%;height:100%;object-fit:cover" alt="">` : `<span class="col gap-2" style="align-items:center">${icon('image', 'i-xl')}<span class="small">Wgraj okładkę</span><span class="xs faint">1280×800 · PNG/JPG/WEBP · do 6 MB</span></span>`}
              <input id="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>
            ${p.cover_url ? `<label class="btn btn-secondary btn-sm btn-block mt-3">${icon('upload', 'i-sm')}Zmień okładkę<input id="cover2" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>` : ''}`)}
          ${h.card('Plik do pobrania', `<div class="row gap-3">
              <span class="icon-box ${p.has_file ? 'green' : ''}">${icon(p.has_file ? 'archive' : 'file', 'i-md')}</span>
              <div style="min-width:0" class="grow"><div class="strong small truncate">${esc(p.file_name || 'Brak pliku')}</div><div class="xs subtle">${p.has_file ? fmt.size(p.file_size) : 'Klienci nie mają czego pobrać'}</div></div></div>
            <label class="btn btn-primary btn-block mt-4">${icon('upload', 'i-md')}${p.has_file ? 'Podmień plik' : 'Wgraj plik'}<input id="file" type="file" hidden></label>
            <div id="file-progress" class="progress mt-3" hidden><div style="width:0"></div></div>
            <div class="hint">ZIP, RAR, JAR i inne · do 500 MB</div>`)}
          ${h.card('Galeria', `<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">
              ${p.gallery.map((g, i) => `<div class="relative" style="aspect-ratio:16/10;border-radius:8px;overflow:hidden;border:1px solid var(--line)"><img src="${esc(g)}" style="width:100%;height:100%;object-fit:cover" alt="">
                <button data-gdel="${i}" class="btn btn-sm btn-icon" style="position:absolute;right:4px;top:4px;--h:24px;background:rgba(0,0,0,.7)" title="Usuń">${icon('x', 'i-xs')}</button></div>`).join('')}
              <label class="dropzone" style="aspect-ratio:16/10;padding:0">${icon('plus', 'i-md')}<input id="gallery" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label></div>`)}
          ${h.card('Wydaj aktualizację', `<form id="vf" class="stack-3">
              <div><label class="label">Nowa wersja <span class="opt">(obecnie v${esc(p.version)})</span></label><input name="version" class="input mono" placeholder="1.3.0" required maxlength="20"></div>
              <div><label class="label">Lista zmian</label><textarea name="changelog" rows="4" class="textarea" style="font-size:13px" placeholder="- Nowa funkcja&#10;- Poprawka błędu"></textarea></div>
              <button class="btn btn-secondary btn-block">${icon('branch', 'i-md')}Opublikuj wersję</button>
              <div class="hint">Najpierw podmień plik, potem opublikuj wersję — klienci zobaczą changelog.</div></form>
            ${p.versions.length ? `<div class="divider mt-6 mb-4"></div><div class="timeline">${p.versions.slice(0, 5).map((v, i) => `<div class="timeline-item ${i ? '' : 'latest'}"><div class="row between"><span class="strong small mono">v${esc(v.version)}</span><span class="xs subtle">${fmt.date(v.created_at)}</span></div><div class="xs subtle mt-1" style="white-space:pre-line">${esc(v.changelog)}</div></div>`).join('')}</div>` : ''}`)}`}
        </div>
      </div>`);

    P.$('#pf').onsubmit = async (e) => {
      e.preventDefault();
      const body = P.formData(e.target);
      P.busy(P.$('#save'), true);
      try {
        if (isNew) {
          const r = await P.guard(() => api('/api/seller/products', { method: 'POST', body }), 'Produkt utworzony — dodaj okładkę i plik');
          location.hash = '#/seller/products/' + r.id;
        } else {
          await P.guard(() => api('/api/seller/products/' + id, { method: 'PATCH', body }), 'Zapisano zmiany');
          P.editor(id);
        }
      } finally { P.busy(P.$('#save'), false); }
    };
    if (isNew) return;

    P.$('#del').onclick = async () => {
      if (!(await VS.confirm('Usunąć ten produkt?', { ok: 'Usuń produkt', danger: true, desc: 'Jeśli produkt ma sprzedaże, zostanie tylko ukryty — klienci zachowają dostęp.' }))) return;
      const r = await P.guard(() => api('/api/seller/products/' + id, { method: 'DELETE' }));
      toast(r.archived ? 'Produkt ukryty (ma sprzedaże)' : 'Produkt usunięty', 'ok');
      location.hash = '#/seller/products';
    };
    const onCover = async (e) => { const f = e.target.files[0]; if (!f) return; await P.guard(() => VS.upload(`/api/seller/products/${id}/cover`, f), 'Okładka zapisana'); P.editor(id); };
    P.$('#cover').onchange = onCover;
    if (P.$('#cover2')) P.$('#cover2').onchange = onCover;
    P.$('#gallery').onchange = async (e) => {
      for (const f of e.target.files) await P.guard(() => VS.upload(`/api/seller/products/${id}/gallery`, f, { method: 'POST' }));
      toast('Galeria zaktualizowana', 'ok'); P.editor(id);
    };
    P.$$('[data-gdel]').forEach((b) => b.onclick = async () => { await api(`/api/seller/products/${id}/gallery/${b.dataset.gdel}`, { method: 'DELETE' }); P.editor(id); });
    P.$('#file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const bar = P.$('#file-progress'); bar.hidden = false;
      await P.guard(() => VS.upload(`/api/seller/products/${id}/file?name=${encodeURIComponent(f.name)}`, f, { onProgress: (n) => (bar.firstElementChild.style.width = n + '%') }), 'Plik wgrany');
      P.editor(id);
    };
    P.$('#vf').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api(`/api/seller/products/${id}/versions`, { method: 'POST', body: P.formData(e.target) }), 'Aktualizacja opublikowana'); P.editor(id); };
  };

  // ================= SPRZEDAŻ =================
  P.views['seller/sales'] = async () => {
    let page = 1, product = '';
    const products = await api('/api/seller/products');
    P.render(`${h.head('Sprzedaż', 'Historia transakcji z podziałem na prowizję i zarobek netto.', `<a href="/api/seller/sales.csv" class="btn btn-secondary">${icon('download', 'i-md')}Eksport CSV</a>`)}
      <div class="kpis k3" id="sum"></div>
      <section class="card mt-6" style="overflow:hidden">
        <div class="card-head"><select id="pf" class="select" style="width:auto;height:34px"><option value="">Wszystkie produkty</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select><span class="small subtle" id="cnt"></span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Zamówienie</th><th>Produkt</th><th>Klient</th><th>Kupon</th><th class="num">Cena</th><th class="num">Prowizja</th><th class="num">Netto</th></tr></thead><tbody id="rows"></tbody></table></div>
        <div class="card-foot" id="pager" hidden></div>
      </section>`);
    const load = async () => {
      const d = await api(`/api/seller/sales?page=${page}&product=${product}`);
      const t = d.items.reduce((a, s) => ({ gross: a.gross + s.price - s.discount, fee: a.fee + s.fee, net: a.net + s.net }), { gross: 0, fee: 0, net: 0 });
      P.$('#sum').innerHTML = h.kpi('Brutto (ta strona)', fmt.money(t.gross), 'banknote') + h.kpi('Prowizja platformy', fmt.money(t.fee), 'percent') + h.kpi('Netto (ta strona)', fmt.money(t.net), 'wallet');
      P.$('#cnt').textContent = `${d.total} ${fmt.plural(d.total, 'transakcja', 'transakcje', 'transakcji')}`;
      P.$('#rows').innerHTML = d.items.length ? d.items.map((s) => `<tr><td class="nowrap">${fmt.datetime(s.paid_at)}</td><td class="mono small">${esc(s.number)}</td><td class="strong">${esc(s.title)}</td>
        <td><div class="strong small">${esc(s.username)}</div><div class="xs subtle">${esc(s.email || '')}</div></td><td>${s.coupon_code ? `<span class="badge badge-violet">${esc(s.coupon_code)}</span>` : '<span class="faint">—</span>'}</td>
        <td class="num nowrap">${fmt.money(s.price - s.discount)}</td><td class="num nowrap subtle">−${fmt.money(s.fee)}</td><td class="num nowrap strong c-green">${fmt.money(s.net)}</td></tr>`).join('')
        : `<tr><td colspan="8">${h.empty('bag', 'Brak sprzedaży')}</td></tr>`;
      const pg = P.$('#pager');
      pg.hidden = d.pages <= 1;
      pg.innerHTML = `<div class="row between"><span class="small subtle">Strona ${d.page} z ${d.pages}</span><div class="row gap-2">
        <button class="btn btn-secondary btn-sm" data-p="-1" ${d.page <= 1 ? 'disabled' : ''}>${icon('chevron-left', 'i-sm')}Poprzednia</button>
        <button class="btn btn-secondary btn-sm" data-p="1" ${d.page >= d.pages ? 'disabled' : ''}>Następna${icon('chevron-right', 'i-sm')}</button></div></div>`;
      pg.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { page += Number(b.dataset.p); load(); });
    };
    P.$('#pf').onchange = (e) => { product = e.target.value; page = 1; load(); };
    load();
  };

  // ================= LICENCJE KLIENTÓW =================
  P.views['seller/licenses'] = async () => {
    const products = await api('/api/seller/products');
    P.render(`${h.head('Licencje klientów', 'Unieważniaj klucze z wycieków, zmieniaj limity, resetuj aktywacje i wydawaj licencje ręcznie.', h.btn('Wydaj licencję', 'plus', 'id="grant"', 'btn-primary'))}
      <section class="card" style="overflow:hidden">
        <div class="card-head" style="justify-content:flex-start;flex-wrap:wrap">${h.search('lq', 'Klucz, nick lub e-mail')}
          <select id="lp" class="select" style="width:auto"><option value="">Wszystkie produkty</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>
          <span class="small subtle ml-auto" id="cnt"></span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Klucz</th><th>Produkt</th><th>Klient</th><th class="num">Serwery</th><th>Ostatnio online</th><th>Status</th><th></th></tr></thead><tbody id="rows"><tr><td colspan="7"><div class="skeleton" style="height:40px"></div></td></tr></tbody></table></div>
      </section>`);
    const load = async () => {
      const list = await api(`/api/seller/licenses?q=${encodeURIComponent(P.$('#lq').value)}&product=${P.$('#lp').value}`);
      P.$('#cnt').textContent = `${list.length} ${fmt.plural(list.length, 'licencja', 'licencje', 'licencji')}`;
      P.$('#rows').innerHTML = list.length ? list.map((l) => `<tr>
        <td><button data-copy="${esc(l.license_key)}" class="mono small strong" title="Kopiuj">${esc(l.license_key)}</button>${l.note ? `<div class="xs subtle">${esc(l.note)}</div>` : ''}</td>
        <td style="max-width:200px"><span class="truncate" style="display:block">${esc(l.title)}</span></td>
        <td><div class="strong small">${esc(l.username)}</div><div class="xs subtle">${esc(l.email || '')}</div></td>
        <td class="num">${l.activations} / ${l.max_activations || '∞'}</td><td class="nowrap">${l.last_seen ? fmt.rel(l.last_seen) : '<span class="faint">—</span>'}</td><td>${h.status(l.status)}</td>
        <td class="text-right nowrap">
          <button data-edit="${esc(JSON.stringify({ id: l.id, max: l.max_activations, note: l.note || '' }))}" class="btn btn-ghost btn-sm btn-icon" title="Limit i notatka">${icon('sliders', 'i-sm')}</button>
          <button data-reset="${l.id}" class="btn btn-ghost btn-sm btn-icon" title="Resetuj aktywacje">${icon('refresh', 'i-sm')}</button>
          <button data-status="${l.id}:${l.status === 'active' ? 'revoked' : 'active'}" class="btn btn-sm ${l.status === 'active' ? 'btn-danger' : 'btn-secondary'}">${l.status === 'active' ? 'Unieważnij' : 'Przywróć'}</button>
        </td></tr>`).join('') : `<tr><td colspan="7">${h.empty('key', 'Brak licencji')}</td></tr>`;
      P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy));
      P.$$('[data-reset]').forEach((b) => b.onclick = async () => { await P.guard(() => api(`/api/seller/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane'); load(); });
      P.$$('[data-status]').forEach((b) => b.onclick = async () => {
        const [lid, status] = b.dataset.status.split(':');
        if (status === 'revoked' && !(await VS.confirm('Unieważnić tę licencję?', { ok: 'Unieważnij', danger: true, desc: 'Zasób klienta przestanie działać, a pobieranie zostanie zablokowane.' }))) return;
        await P.guard(() => api('/api/seller/licenses/' + lid, { method: 'PATCH', body: { status } }), status === 'revoked' ? 'Licencja unieważniona' : 'Licencja przywrócona');
        load();
      });
      P.$$('[data-edit]').forEach((b) => b.onclick = () => {
        const l = JSON.parse(b.dataset.edit);
        const m = VS.modal({ title: 'Ustawienia licencji', body: `<form class="stack" id="lf">
          <div><label class="label">Limit serwerów</label><input name="max_activations" type="number" min="0" class="input" value="${l.max}"><div class="hint">0 = bez limitu</div></div>
          <div><label class="label">Notatka <span class="opt">(widoczna tylko dla Ciebie)</span></label><input name="note" class="input" value="${esc(l.note)}" maxlength="200"></div></form>`,
          foot: '<button class="btn btn-secondary" data-close>Anuluj</button><button class="btn btn-primary" form="lf">Zapisz</button>' });
        m.el.querySelector('#lf').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/licenses/' + l.id, { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano'); m.close(); load(); };
      });
    };
    let t;
    P.$('#lq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    P.$('#lp').onchange = load;
    P.$('#grant').onclick = () => {
      const m = VS.modal({ title: 'Wydaj licencję ręcznie', desc: 'Dla partnera, testera lub w konkursie. Produkt trafi do biblioteki klienta.', body: `<form class="stack" id="gf">
        <div><label class="label">Produkt</label><select name="product_id" class="select" required>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
        <div><label class="label">E-mail konta klienta</label><input name="email" type="email" class="input" required placeholder="klient@przyklad.pl"></div>
        <div><label class="label">Notatka</label><input name="note" class="input" placeholder="np. Giveaway na Discordzie"></div></form>`,
        foot: '<button class="btn btn-secondary" data-close>Anuluj</button><button class="btn btn-primary" form="gf">Wydaj licencję</button>' });
      m.el.querySelector('#gf').onsubmit = async (e) => { e.preventDefault(); const r = await P.guard(() => api('/api/seller/licenses', { method: 'POST', body: P.formData(e.target) })); toast('Wydano klucz ' + r.license_key, 'ok'); m.close(); load(); };
    };
    load();
  };

  // ================= KUPONY =================
  P.views['seller/coupons'] = async () => {
    const [list, products] = await Promise.all([api('/api/seller/coupons'), api('/api/seller/products')]);
    P.render(`${h.head('Kody rabatowe', 'Procentowe rabaty naliczane automatycznie w koszyku klienta.')}
      <div class="split-l">
        ${h.card('Nowy kod', `<form id="cf" class="stack">
          <div><label class="label">Kod</label><input name="code" class="input mono" style="text-transform:uppercase" placeholder="LATO25" required maxlength="24"></div>
          <div><label class="label">Rabat</label><div class="relative"><input name="percent" type="number" min="1" max="100" class="input" value="10" required style="padding-right:36px"><span class="input-affix small subtle" style="right:12px">%</span></div></div>
          <div><label class="label">Dotyczy</label><select name="product_id" class="select"><option value="">Wszystkich moich produktów</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
          <div class="form-grid"><div><label class="label">Limit użyć</label><input name="max_uses" type="number" min="1" class="input" placeholder="∞"></div>
            <div><label class="label">Ważny do</label><input name="expires_at" type="date" class="input"></div></div>
          <button class="btn btn-primary btn-block">${icon('plus', 'i-md')}Utwórz kod</button></form>`)}
        <section class="card" style="overflow:hidden">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Kod</th><th>Rabat</th><th>Dotyczy</th><th>Użycia</th><th>Ważność</th><th>Aktywny</th><th></th></tr></thead><tbody>
          ${list.map((c) => {
            const expired = c.expires_at && c.expires_at < Date.now();
            return `<tr><td><span class="mono strong">${esc(c.code)}</span></td><td class="strong">−${c.percent}%</td><td>${esc(c.product_title || 'Wszystkie produkty')}</td>
            <td class="num">${c.uses}${c.max_uses ? ' / ' + c.max_uses : ''}</td><td class="${expired ? 'c-red' : ''}">${c.expires_at ? fmt.date(c.expires_at) : 'Bezterminowo'}</td>
            <td><label class="switch"><input type="checkbox" data-toggle="${c.id}" ${c.active ? 'checked' : ''} aria-label="Aktywny"></label></td>
            <td class="text-right"><button data-del="${c.id}" class="btn btn-ghost btn-sm btn-icon" title="Usuń">${icon('trash', 'i-sm')}</button></td></tr>`;
          }).join('')}</tbody></table></div>` : h.empty('ticket', 'Brak kodów rabatowych', 'Utwórz pierwszy kod i udostępnij go na Discordzie.')}</section>
      </div>`);
    P.$('#cf').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/coupons', { method: 'POST', body: P.formData(e.target) }), 'Kod utworzony'); P.views['seller/coupons'](); };
    P.$$('[data-toggle]').forEach((c) => c.onchange = () => api('/api/seller/coupons/' + c.dataset.toggle, { method: 'PATCH', body: { active: c.checked } }).then(() => toast(c.checked ? 'Kod włączony' : 'Kod wyłączony', 'ok')));
    P.$$('[data-del]').forEach((b) => b.onclick = async () => { if (!(await VS.confirm('Usunąć kod rabatowy?', { ok: 'Usuń', danger: true }))) return; await api('/api/seller/coupons/' + b.dataset.del, { method: 'DELETE' }); P.views['seller/coupons'](); });
  };

  // ================= RECENZJE =================
  P.views['seller/reviews'] = async () => {
    const list = await api('/api/seller/reviews');
    const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    const dist = [5, 4, 3, 2, 1].map((s) => [s, list.filter((r) => r.rating === s).length]);
    P.render(`${h.head('Recenzje', 'Opinie klientów o Twoich produktach.')}
      <div class="split-l">
        <section class="card card-pad text-center">
          <div class="kpi-value" style="font-size:48px">${avg ? avg.toFixed(2).replace('.', ',') : '–'}</div>
          <div class="row center mt-2">${VS.stars(avg, 'i-md')}</div>
          <div class="small subtle mt-2">${list.length} ${fmt.plural(list.length, 'opinia', 'opinie', 'opinii')}</div>
          <div class="rating-bars mt-6 text-left">${dist.map(([s, n]) => `<div class="rating-bar"><span>${s}</span><div class="track"><div class="fill" style="width:${list.length ? (n / list.length) * 100 : 0}%"></div></div><span class="text-right">${n}</span></div>`).join('')}</div>
        </section>
        <section class="card" style="overflow:hidden">${list.length ? list.map((r) => `
          <div class="list-item" style="align-items:flex-start;padding:18px 20px">${VS.avatar(r)}
            <div class="grow"><div class="row between wrap gap-2"><div class="row gap-2"><span class="strong small">${esc(r.username)}</span>${VS.stars(r.rating, 'i-xs')}</div><span class="xs subtle">${fmt.rel(r.created_at)}</span></div>
              ${r.comment ? `<p class="muted mt-2" style="font-size:14px">${esc(r.comment)}</p>` : ''}
              <a href="/produkt/${esc(r.slug)}#recenzje" target="_blank" class="chip mt-3" style="height:26px">${esc(r.title)}</a></div>
          </div>`).join('') : h.empty('star', 'Brak recenzji', 'Pojawią się, gdy klienci ocenią Twoje produkty.')}</section>
      </div>`);
  };

  // ================= WYPŁATY =================
  P.views['seller/payouts'] = async () => {
    const d = await api('/api/seller/payouts');
    const methods = { bank: 'Przelew bankowy', paypal: 'PayPal', revolut: 'Revolut' };
    P.render(`${h.head('Wypłaty', `Minimalna kwota wypłaty: ${fmt.money(d.min_payout)}. Realizacja do 3 dni roboczych.`)}
      <div class="kpis">
        ${h.kpi('Dostępne', fmt.money(d.balance.available), 'wallet')}${h.kpi('W realizacji', fmt.money(d.balance.pending), 'clock')}
        ${h.kpi('Wypłacone', fmt.money(d.balance.paid_out), 'check-circle')}${h.kpi('Zarobione łącznie', fmt.money(d.balance.earned), 'banknote')}
      </div>
      <div class="split-l mt-6">
        ${h.card('Zleć wypłatę', d.method ? `<form id="po" class="stack">
            <div class="list-item" style="padding:12px;border:1px solid var(--line);border-radius:var(--r-md)"><span class="icon-box sm">${icon('landmark', 'i-sm')}</span><div class="grow" style="min-width:0"><div class="strong small">${esc(methods[d.method] || d.method)}</div><div class="xs subtle mono truncate">${esc(d.details || '')}</div></div><a href="#/seller/store" class="link-brand xs">Zmień</a></div>
            <div><label class="label">Kwota</label><div class="relative"><input name="amount_pln" type="number" step="0.01" min="${d.min_payout / 100}" max="${d.balance.available / 100}" class="input input-lg" value="${(Math.max(0, d.balance.available) / 100).toFixed(2)}" style="padding-right:40px"><span class="input-affix small subtle" style="right:14px">zł</span></div></div>
            <button class="btn btn-primary btn-lg btn-block" ${d.balance.available < d.min_payout ? 'disabled' : ''}>Wypłać środki</button></form>`
          : h.empty('landmark', 'Ustaw metodę wypłaty', 'Dodaj numer konta, PayPal lub Revolut w ustawieniach sklepu.', '<a href="#/seller/store" class="btn btn-primary">Ustawienia sklepu</a>'))}
        ${h.card('Historia wypłat', d.history.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th class="num">Kwota</th><th>Metoda</th><th>Status</th><th>Zrealizowano</th></tr></thead><tbody>
          ${d.history.map((p) => `<tr><td class="nowrap">${fmt.datetime(p.created_at)}</td><td class="num strong">${fmt.money(p.amount)}</td><td>${esc(methods[p.method] || p.method || '')}</td><td>${h.status(p.status === 'paid' ? 'payout_paid' : p.status)}</td><td>${p.processed_at ? fmt.date(p.processed_at) : '<span class="faint">—</span>'}</td></tr>`).join('')}
          </tbody></table></div>` : h.empty('history', 'Brak wypłat'), { pad: false })}
      </div>`);
    const f = P.$('#po');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/payouts', { method: 'POST', body: P.formData(e.target) }), 'Zlecenie wypłaty przyjęte'); P.views['seller/payouts'](); };
  };

  // ================= USTAWIENIA SKLEPU =================
  P.views['seller/store'] = async () => {
    await P.refreshMe();
    const me = VS.me;
    P.render(`${h.head('Ustawienia sklepu', `Profil publiczny: <a class="link" href="/tworca/${esc(me.store_slug)}" target="_blank">velorie.store/tworca/${esc(me.store_slug)}</a>`)}
      <form id="sf" class="half" style="align-items:start">
        ${h.card('Profil sklepu', `<div class="stack">
          <div><label class="label">Nazwa sklepu</label><input name="store_name" class="input" value="${esc(me.store_name)}" maxlength="40" required></div>
          <div><label class="label">Opis</label><textarea name="bio" rows="5" class="textarea" maxlength="500" placeholder="Czym się zajmujesz, jakie wsparcie oferujesz…">${esc(me.bio || '')}</textarea></div>
          <div class="hint">Logo sklepu to zdjęcie Twojego konta — zmienisz je w <a class="link" href="#/account/settings">ustawieniach konta</a>.</div></div>`)}
        ${h.card('Dane do wypłat', `<div class="stack">
          <div><label class="label">Metoda</label><select name="payout_method" class="select">
            <option value="">Wybierz…</option>
            <option value="bank" ${me.payout_method === 'bank' ? 'selected' : ''}>Przelew bankowy (IBAN)</option>
            <option value="paypal" ${me.payout_method === 'paypal' ? 'selected' : ''}>PayPal (e-mail)</option>
            <option value="revolut" ${me.payout_method === 'revolut' ? 'selected' : ''}>Revolut (@tag)</option></select></div>
          <div><label class="label">Numer konta / adres</label><input name="payout_details" class="input mono" value="${esc(me.payout_details || '')}" maxlength="120" placeholder="PL00 0000 0000 …"></div>
          <div class="row end"><button class="btn btn-primary">Zapisz ustawienia</button></div></div>`)}
      </form>`);
    P.$('#sf').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/store', { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano'); P.refreshMe(); };
  };
})();
