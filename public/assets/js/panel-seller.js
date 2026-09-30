/* Velorie Store — panel twórcy (klient biznesowy) */
(function () {
  const { api, esc, fmt, toast } = VS;
  const P = window.Panel;
  const h = P.h;

  const chartDefaults = () => {
    if (!window.Chart) return;
    Chart.defaults.color = 'rgba(255,255,255,.55)';
    Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial';
    Chart.defaults.borderColor = 'rgba(255,255,255,.06)';
  };
  const tooltip = {
    backgroundColor: 'rgba(10,16,48,.95)', borderColor: 'rgba(255,255,255,.15)', borderWidth: 1, padding: 10, cornerRadius: 10,
    titleColor: '#fff', bodyColor: 'rgba(255,255,255,.85)', displayColors: false,
  };

  // =================== STATYSTYKI ===================
  P.views['seller/stats'] = async () => {
    const days = Number(sessionStorage.getItem('vs_days') || 30);
    const d = await api('/api/seller/stats?days=' + days);
    const k = d.kpi;
    const range = [7, 30, 90, 365].map((n) => `<button data-days="${n}" class="rounded-xl px-3 py-1.5 text-sm font-semibold ${n === d.days ? 'btn-primary' : 'text-white/60 hover:text-white'}">${n === 365 ? 'Rok' : n + ' dni'}</button>`).join('');
    P.render(`
      ${h.title('Statystyki sprzedaży', `${esc(VS.me.store_name)} • porównanie z poprzednim okresem ${d.days} dni`,
        `<div class="flex gap-1 p-1 rounded-2xl bg-black/30 border border-white/10">${range}</div>
         <a href="/tworca/${esc(VS.me.store_slug)}" target="_blank" class="inline-flex items-center gap-2 rounded-xl btn-ghost px-4 py-2 text-sm"><i data-lucide="external-link" class="h-4 w-4"></i>Mój sklep</a>`)}
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        ${h.kpi('Przychód brutto', fmt.money(k.revenue), 'banknote', { delta: k.revenue_delta })}
        ${h.kpi('Twój zarobek (netto)', fmt.money(k.net), 'wallet', { delta: k.net_delta, hint: `prowizja ${d.fee_percent}%: ${fmt.money(k.fees)}` })}
        ${h.kpi('Sprzedaże', fmt.num(k.sales), 'shopping-bag', { delta: k.sales_delta, hint: `${k.buyers} kupujących` })}
        ${h.kpi('Śr. wartość sprzedaży', fmt.money(k.avg_order), 'receipt', { hint: `konwersja ${k.conversion}%` })}
      </div>

      <div class="grid xl:grid-cols-3 gap-6 mt-6">
        <section class="glass rounded-3xl p-5 xl:col-span-2">
          <div class="flex items-center justify-between mb-3"><h2 class="font-bold">Przychód dzienny</h2><span class="text-xs text-white/45">brutto, zł</span></div>
          <div class="h-64"><canvas id="ch-revenue" aria-label="Wykres przychodu dziennego"></canvas></div>
          <div class="flex items-center justify-between mt-5 mb-3"><h2 class="font-bold">Liczba sprzedaży</h2><span class="text-xs text-white/45">szt. dziennie</span></div>
          <div class="h-40"><canvas id="ch-sales" aria-label="Wykres liczby sprzedaży"></canvas></div>
        </section>
        <div class="space-y-6">
          <section class="relative overflow-hidden glass rounded-3xl p-5">
            <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent)]/20 blur-3xl"></div>
            <div class="relative"><div class="text-xs text-white/55">Dostępne do wypłaty</div>
              <div class="text-3xl font-black mt-1">${fmt.money(d.balance.available)}</div>
              <div class="text-xs text-white/45 mt-1">Zarobione łącznie ${fmt.money(d.balance.earned)} • wypłacone ${fmt.money(d.balance.paid_out)}</div>
              <a href="#/seller/payouts" class="mt-4 inline-flex items-center gap-2 rounded-xl btn-primary px-4 py-2 text-sm font-semibold"><i data-lucide="arrow-down-to-line" class="h-4 w-4"></i>Wypłać środki</a></div>
          </section>
          ${h.card('Ogółem', `<dl class="grid grid-cols-2 gap-4 text-sm">
            <div><dt class="text-xs text-white/45">Produkty</dt><dd class="font-bold text-lg">${d.totals.published}<span class="text-white/40 text-sm">/${d.totals.products}</span></dd></div>
            <div><dt class="text-xs text-white/45">Sprzedaże</dt><dd class="font-bold text-lg">${fmt.num(d.totals.all_sales)}</dd></div>
            <div><dt class="text-xs text-white/45">Wyświetlenia</dt><dd class="font-bold text-lg">${fmt.num(d.totals.views)}</dd></div>
            <div><dt class="text-xs text-white/45">Pobrania</dt><dd class="font-bold text-lg">${fmt.num(d.totals.downloads)}</dd></div>
            <div><dt class="text-xs text-white/45">Aktywne licencje</dt><dd class="font-bold text-lg">${fmt.num(d.totals.licenses)}</dd></div>
            <div><dt class="text-xs text-white/45">Serwery (7 dni)</dt><dd class="font-bold text-lg">${fmt.num(d.totals.active_servers)}</dd></div>
            <div class="col-span-2"><dt class="text-xs text-white/45">Średnia ocen</dt><dd class="font-bold text-lg flex items-center gap-2">${d.totals.rating ? Number(d.totals.rating).toFixed(2) : '–'} ${VS.stars(d.totals.rating)}<span class="text-xs text-white/45 font-normal">(${d.totals.reviews})</span></dd></div>
          </dl>`)}
        </div>
      </div>

      <div class="grid xl:grid-cols-2 gap-6 mt-6">
        ${h.card('Najlepsze produkty', d.top_products.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Produkt</th><th class="text-right">Sprzedaże</th><th class="text-right">Przychód</th><th class="w-1/3"></th></tr></thead><tbody>
          ${d.top_products.map((t) => `<tr><td class="font-semibold">${esc(t.title)}</td><td class="text-right">${t.sales}</td><td class="text-right whitespace-nowrap">${fmt.money(t.revenue)}</td>
            <td><div class="h-2 rounded-full bg-white/10 overflow-hidden"><div class="h-full rounded-full bg-[#ff0354]" style="width:${(t.revenue / d.top_products[0].revenue) * 100 || 0}%"></div></div></td></tr>`).join('')}
          </tbody></table></div>` : h.empty('chart-no-axes-column', 'Brak sprzedaży w tym okresie.'))}
        ${h.card('Przychód wg kategorii', d.categories.length ? `<div style="height:${Math.max(140, d.categories.length * 44)}px"><canvas id="ch-cats" aria-label="Przychód według kategorii"></canvas></div>` : h.empty('pie-chart', 'Brak danych.'))}
      </div>

      ${h.card('Ostatnie sprzedaże', d.recent_sales.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Produkt</th><th>Kupujący</th><th class="text-right">Cena</th><th class="text-right">Netto</th></tr></thead><tbody>
        ${d.recent_sales.map((s) => `<tr><td class="whitespace-nowrap text-white/60">${fmt.rel(s.paid_at)}</td><td class="font-semibold">${esc(s.title)}</td><td>${esc(s.username)}</td>
          <td class="text-right whitespace-nowrap">${fmt.money(s.price - s.discount)}</td><td class="text-right whitespace-nowrap text-emerald-400">+${fmt.money(s.net)}</td></tr>`).join('')}
        </tbody></table></div><a href="#/seller/sales" class="mt-3 inline-flex text-sm text-[var(--accent)] hover:underline">Pełna historia sprzedaży →</a>` : h.empty('shopping-bag', 'Brak sprzedaży.'), 'mt-6')}
    `);
    P.$$('[data-days]').forEach((b) => b.onclick = () => { try { sessionStorage.setItem('vs_days', b.dataset.days); } catch {} P.views['seller/stats'](); });

    if (!window.Chart) return;
    chartDefaults();
    const labels = d.series.map((s) => new Date(s.date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }));
    const ctx = document.getElementById('ch-revenue').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,3,84,.35)'); grad.addColorStop(1, 'rgba(255,3,84,0)');
    const axis = { grid: { color: 'rgba(255,255,255,.05)' }, border: { display: false } };
    P.charts.push(new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Przychód', data: d.series.map((s) => s.revenue / 100), borderColor: '#ff0354', backgroundColor: grad, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#ff0354', pointHoverBorderColor: '#0a1030', pointHoverBorderWidth: 2 }] },
      options: {
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => `Przychód: ${fmt.money(Math.round(c.parsed.y * 100))}`, afterLabel: (c) => `Netto: ${fmt.money(d.series[c.dataIndex].net)}` } } },
        scales: { x: { ...axis, grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { ...axis, beginAtZero: true, ticks: { callback: (v) => v + ' zł', maxTicksLimit: 5 } } },
      },
    }));
    P.charts.push(new Chart(document.getElementById('ch-sales'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sprzedaże', data: d.series.map((s) => s.sales), backgroundColor: '#8b5cf6', hoverBackgroundColor: '#a78bfa', borderRadius: 4, borderSkipped: 'start', maxBarThickness: 18 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => `Sprzedaże: ${c.parsed.y}` } } },
        scales: { x: { ...axis, grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { ...axis, beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 4 } } },
      },
    }));
    const cats = document.getElementById('ch-cats');
    if (cats) P.charts.push(new Chart(cats, {
      type: 'bar',
      data: { labels: d.categories.map((c) => c.name), datasets: [{ label: 'Przychód', data: d.categories.map((c) => c.revenue / 100), backgroundColor: '#ff0354', hoverBackgroundColor: '#ff4d85', borderRadius: 4, borderSkipped: 'start', maxBarThickness: 22 }] },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (c) => fmt.money(Math.round(c.parsed.x * 100)) } } },
        scales: { x: { ...axis, beginAtZero: true, ticks: { callback: (v) => v + ' zł', maxTicksLimit: 5 } }, y: { ...axis, grid: { display: false }, ticks: { color: 'rgba(255,255,255,.75)' } } },
      },
    }));
  };

  // =================== PRODUKTY ===================
  P.views['seller/products'] = async (arg) => {
    if (arg) return P.editor(arg);
    const list = await api('/api/seller/products');
    P.render(`${h.title('Produkty', `${list.length} produktów w sklepie`, '<a href="#/seller/products/new" class="inline-flex items-center gap-2 rounded-xl btn-primary px-4 py-2 text-sm font-semibold"><i data-lucide="plus" class="h-4 w-4"></i>Dodaj produkt</a>')}
      ${list.length ? `<div class="glass rounded-3xl p-2 sm:p-4"><div class="table-wrap"><table class="table">
        <thead><tr><th>Produkt</th><th>ID</th><th>Status</th><th class="text-right">Cena</th><th class="text-right">Sprzedaże</th><th class="text-right">Przychód</th><th>Ocena</th><th>Plik</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr>
          <td><div class="flex items-center gap-3 min-w-[240px]"><img src="${esc(p.cover_url || '')}" class="w-20 aspect-video rounded-lg object-cover bg-black/30" alt="">
            <div class="min-w-0"><a href="#/seller/products/${p.id}" class="font-semibold hover:underline line-clamp-1">${esc(p.title)}</a><div class="text-xs text-white/45">${esc(VS.CAT_NAMES[p.category] || p.category)} • v${esc(p.version)}</div></div></div></td>
          <td class="font-mono text-xs text-white/60">${p.id}</td>
          <td>${h.status(p.status)}</td>
          <td class="text-right whitespace-nowrap">${fmt.price(p.price)}</td>
          <td class="text-right">${p.sales}</td>
          <td class="text-right whitespace-nowrap">${fmt.money(p.revenue)}</td>
          <td class="whitespace-nowrap">${p.rating ? `★ ${Number(p.rating).toFixed(1)}` : '—'}</td>
          <td>${p.has_file ? '<i data-lucide="file-check" class="h-4 w-4 text-emerald-400"></i>' : '<span class="badge badge-yellow">Brak</span>'}</td>
          <td class="text-right whitespace-nowrap">
            <a href="#/seller/products/${p.id}" class="inline-flex rounded-lg btn-ghost p-2" title="Edytuj"><i data-lucide="pencil" class="h-4 w-4"></i></a>
            <a href="/produkt/${esc(p.slug)}" target="_blank" class="inline-flex rounded-lg btn-ghost p-2" title="Podgląd"><i data-lucide="eye" class="h-4 w-4"></i></a>
          </td></tr>`).join('')}
        </tbody></table></div></div>`
        : h.card('', h.empty('package-plus', 'Nie masz jeszcze produktów. Dodaj pierwszy i zacznij sprzedawać!', '<a href="#/seller/products/new" class="inline-flex rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Dodaj produkt</a>'))}`);
  };

  P.editor = async (id) => {
    const isNew = id === 'new';
    const cats = await VS.categories();
    const p = isNew ? { title: '', category: '', price: 0, summary: '', description: '', tags: [], version: '1.0.0', compatibility: '', license_enabled: true, max_activations: 1, status: 'draft', gallery: [], versions: [] }
      : await api('/api/seller/products/' + id);
    const catOpts = cats.map((c) => `<option value="${c.id}" ${c.id === p.category ? 'selected' : ''}>${c.group} — ${esc(c.name)}</option>`).join('');

    P.render(`
      <a href="#/seller/products" class="inline-flex items-center gap-1 text-sm text-white/55 hover:text-white mb-3"><i data-lucide="arrow-left" class="h-4 w-4"></i>Produkty</a>
      ${h.title(isNew ? 'Nowy produkt' : esc(p.title), isNew ? 'Uzupełnij podstawowe dane — pliki dodasz w następnym kroku.' : `ID produktu (do API licencji): <span class="font-mono text-white">${p.id}</span> ${h.status(p.status)}`,
        isNew ? '' : `<a href="/produkt/${esc(p.slug)}" target="_blank" class="inline-flex items-center gap-2 rounded-xl btn-ghost px-4 py-2 text-sm"><i data-lucide="eye" class="h-4 w-4"></i>Podgląd</a>`)}
      <div class="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <form id="pf" class="space-y-6">
          ${h.card('Podstawowe informacje', `<div class="grid sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2"><label class="label">Nazwa produktu *</label><input name="title" class="field" value="${esc(p.title)}" maxlength="90" required placeholder="np. Advanced Garage System"></div>
            <div><label class="label">Kategoria *</label><select name="category" class="field" required><option value="">Wybierz…</option>${catOpts}</select></div>
            <div><label class="label">Cena (zł) — 0 = darmowy</label><input name="price_pln" type="number" min="0" step="0.01" class="field" value="${(p.price / 100).toFixed(2)}"></div>
            <div class="sm:col-span-2"><label class="label">Krótki opis (na kartach produktu)</label><input name="summary" class="field" value="${esc(p.summary)}" maxlength="200"></div>
            <div class="sm:col-span-2"><label class="label">Pełny opis <span class="text-white/35 font-normal">— obsługuje ## nagłówki, - listy, **pogrubienie**, \`kod\`</span></label><textarea name="description" rows="12" class="field font-mono text-sm">${esc(p.description)}</textarea></div>
            <div><label class="label">Kompatybilność</label><input name="compatibility" class="field" value="${esc(p.compatibility)}" placeholder="np. ESX • QBCore / Paper 1.20+"></div>
            <div><label class="label">Tagi (po przecinku)</label><input name="tags" class="field" value="${esc(p.tags.join(', '))}" placeholder="garaż, esx, ui"></div>
            ${isNew ? `<div><label class="label">Wersja</label><input name="version" class="field" value="${esc(p.version)}" maxlength="20"></div>` : ''}
          </div>`)}
          ${h.card('Licencjonowanie', `<div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer"><input name="license_enabled" type="checkbox" class="check" ${p.license_enabled ? 'checked' : ''}><span><b>Wymagaj klucza licencji</b><span class="block text-xs text-white/50">Kupujący dostaje klucz VEL-…, który Twój kod weryfikuje przez API.</span></span></label>
            <div class="max-w-xs"><label class="label">Limit serwerów na licencję (0 = bez limitu)</label><input name="max_activations" type="number" min="0" max="1000" class="field" value="${p.max_activations}"></div>
            <a href="/docs.html" target="_blank" class="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"><i data-lucide="book-open" class="h-4 w-4"></i>Kod integracji: Java, Lua, JS</a>
          </div>`)}
          <div class="flex flex-wrap items-center gap-3">
            <select name="status" class="field !w-auto"><option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Szkic (niewidoczny)</option><option value="published" ${p.status === 'published' ? 'selected' : ''}>Opublikowany</option>${p.status === 'blocked' ? '<option value="blocked" selected>Zablokowany przez administrację</option>' : ''}</select>
            <button class="inline-flex items-center gap-2 rounded-xl btn-primary px-5 py-3 text-sm font-semibold"><i data-lucide="save" class="h-4 w-4"></i>${isNew ? 'Utwórz produkt' : 'Zapisz zmiany'}</button>
            ${isNew ? '' : '<button type="button" id="del" class="inline-flex items-center gap-2 rounded-xl btn-danger px-4 py-3 text-sm font-semibold ml-auto"><i data-lucide="trash-2" class="h-4 w-4"></i>Usuń</button>'}
          </div>
        </form>

        <div class="space-y-6">
          ${isNew ? h.card('Pliki', '<p class="text-sm text-white/55">Okładkę, galerię i plik do pobrania dodasz po utworzeniu produktu.</p>') : `
          ${h.card('Okładka (16:9)', `<div class="aspect-video rounded-2xl overflow-hidden bg-black/30 border border-white/10 grid place-items-center">${p.cover_url ? `<img src="${esc(p.cover_url)}" class="w-full h-full object-cover" alt="">` : '<i data-lucide="image" class="h-10 w-10 text-white/25"></i>'}</div>
            <label class="mt-3 w-full inline-flex justify-center items-center gap-2 rounded-xl btn-ghost px-4 py-2.5 text-sm cursor-pointer"><i data-lucide="upload" class="h-4 w-4"></i>${p.cover_url ? 'Zmień okładkę' : 'Wgraj okładkę'}<input id="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden"></label>
            <p class="text-[11px] text-white/40 mt-2">PNG/JPG/WEBP, maks. 6 MB, zalecane 1280×720.</p>`)}
          ${h.card('Plik produktu', `<div class="glass-soft rounded-2xl p-4 flex items-center gap-3">
              <span class="h-10 w-10 rounded-xl grid place-items-center ${p.has_file ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'}"><i data-lucide="${p.has_file ? 'file-archive' : 'file-question'}" class="h-5 w-5"></i></span>
              <div class="min-w-0"><div class="font-semibold text-sm truncate">${esc(p.file_name || 'Brak pliku')}</div><div class="text-xs text-white/45">${p.has_file ? fmt.size(p.file_size) : 'Kupujący nie będą mogli nic pobrać'}</div></div></div>
            <label class="mt-3 w-full inline-flex justify-center items-center gap-2 rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold cursor-pointer"><i data-lucide="upload-cloud" class="h-4 w-4"></i>${p.has_file ? 'Podmień plik' : 'Wgraj plik (ZIP, RAR, JAR…)'}<input id="file" type="file" class="hidden"></label>
            <div id="file-progress" class="hidden mt-3 h-2 rounded-full bg-white/10 overflow-hidden"><div class="h-full bg-gradient-to-r from-[#ff0354] to-[#7c3aed] w-0 transition-all"></div></div>`)}
          ${h.card('Galeria', `<div class="grid grid-cols-3 gap-2">${p.gallery.map((g, i) => `<div class="relative group aspect-video rounded-lg overflow-hidden bg-black/30"><img src="${esc(g)}" class="w-full h-full object-cover" alt="">
              <button data-gdel="${i}" class="absolute inset-0 hidden group-hover:grid place-items-center bg-black/60" title="Usuń"><i data-lucide="trash-2" class="h-4 w-4"></i></button></div>`).join('')}
              <label class="aspect-video rounded-lg border border-dashed border-white/20 grid place-items-center cursor-pointer hover:border-white/40 text-white/40"><i data-lucide="plus" class="h-5 w-5"></i><input id="gallery" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" multiple></label></div>`)}
          ${h.card('Nowa wersja / aktualizacja', `<form id="vf" class="space-y-3">
              <div><label class="label">Numer wersji (obecnie v${esc(p.version)})</label><input name="version" class="field" placeholder="np. 1.3.0" required maxlength="20"></div>
              <div><label class="label">Lista zmian</label><textarea name="changelog" rows="4" class="field text-sm" placeholder="- Nowa funkcja…&#10;- Poprawka błędu…"></textarea></div>
              <button class="w-full rounded-xl btn-ghost px-4 py-2.5 text-sm font-semibold">Opublikuj aktualizację</button>
              <p class="text-[11px] text-white/40">Najpierw podmień plik produktu, potem dodaj wersję — kupujący zobaczą ją w panelu.</p></form>
            ${p.versions.length ? `<div class="mt-4 space-y-2 max-h-64 overflow-y-auto">${p.versions.map((v) => `<div class="glass-soft rounded-xl p-3"><div class="flex justify-between text-sm"><b>v${esc(v.version)}</b><span class="text-xs text-white/45">${fmt.date(v.created_at)}</span></div><div class="text-xs text-white/55 whitespace-pre-line mt-1">${esc(v.changelog)}</div></div>`).join('')}</div>` : ''}`)}
          `}
        </div>
      </div>`);

    P.$('#pf').onsubmit = async (e) => {
      e.preventDefault();
      const body = P.formData(e.target);
      if (isNew) {
        const r = await P.guard(() => api('/api/seller/products', { method: 'POST', body }), 'Produkt utworzony — dodaj okładkę i plik');
        location.hash = '#/seller/products/' + r.id;
      } else {
        await P.guard(() => api('/api/seller/products/' + id, { method: 'PATCH', body }), 'Zapisano zmiany');
        P.editor(id);
      }
    };
    if (isNew) return;

    P.$('#del').onclick = async () => {
      if (!(await VS.confirm('Usunąć produkt? Jeśli ma sprzedaże, zostanie tylko ukryty (kupujący zachowają dostęp).', { ok: 'Usuń', danger: true }))) return;
      const r = await P.guard(() => api('/api/seller/products/' + id, { method: 'DELETE' }));
      toast(r.archived ? 'Produkt ukryty (ma sprzedaże)' : 'Produkt usunięty', 'ok');
      location.hash = '#/seller/products';
    };
    P.$('#cover').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      await P.guard(() => VS.upload(`/api/seller/products/${id}/cover`, f), 'Okładka zapisana');
      P.editor(id);
    };
    P.$('#gallery').onchange = async (e) => {
      for (const f of e.target.files) await P.guard(() => VS.upload(`/api/seller/products/${id}/gallery`, f, { method: 'POST' }));
      toast('Galeria zaktualizowana', 'ok');
      P.editor(id);
    };
    P.$$('[data-gdel]').forEach((b) => b.onclick = async () => { await api(`/api/seller/products/${id}/gallery/${b.dataset.gdel}`, { method: 'DELETE' }); P.editor(id); });
    P.$('#file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const bar = P.$('#file-progress');
      bar.classList.remove('hidden');
      await P.guard(() => VS.upload(`/api/seller/products/${id}/file?name=${encodeURIComponent(f.name)}`, f, { onProgress: (n) => (bar.firstElementChild.style.width = n + '%') }), 'Plik wgrany');
      P.editor(id);
    };
    P.$('#vf').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api(`/api/seller/products/${id}/versions`, { method: 'POST', body: P.formData(e.target) }), 'Aktualizacja opublikowana');
      P.editor(id);
    };
  };
  P.views['seller/products/new'] = () => P.editor('new');

  // =================== SPRZEDAŻ ===================
  P.views['seller/sales'] = async () => {
    const page = Number(sessionStorage.getItem('vs_sales_page') || 1);
    const [d, products] = await Promise.all([api('/api/seller/sales?page=' + page), api('/api/seller/products')]);
    const totals = d.items.reduce((a, s) => ({ gross: a.gross + s.price - s.discount, fee: a.fee + s.fee, net: a.net + s.net }), { gross: 0, fee: 0, net: 0 });
    P.render(`${h.title('Sprzedaż', `${d.total} transakcji`, '<a href="/api/seller/sales.csv" class="inline-flex items-center gap-2 rounded-xl btn-ghost px-4 py-2 text-sm"><i data-lucide="file-spreadsheet" class="h-4 w-4"></i>Eksport CSV</a>')}
      <div class="grid grid-cols-3 gap-4 mb-6">
        ${h.kpi('Brutto (strona)', fmt.money(totals.gross), 'banknote')}${h.kpi('Prowizja', fmt.money(totals.fee), 'percent')}${h.kpi('Netto (strona)', fmt.money(totals.net), 'wallet')}
      </div>
      <div class="glass rounded-3xl p-2 sm:p-4">
        <div class="p-2"><select id="pf" class="field !w-auto text-sm"><option value="">Wszystkie produkty</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Zamówienie</th><th>Produkt</th><th>Kupujący</th><th>Kupon</th><th class="text-right">Cena</th><th class="text-right">Prowizja</th><th class="text-right">Netto</th></tr></thead>
        <tbody id="rows">${rows(d.items)}</tbody></table></div>
        <div class="flex justify-center gap-2 mt-4">${d.pages > 1 ? Array.from({ length: Math.min(d.pages, 20) }, (_, i) => `<button data-page="${i + 1}" class="h-9 w-9 rounded-xl ${i + 1 === d.page ? 'btn-primary' : 'btn-ghost'} text-sm">${i + 1}</button>`).join('') : ''}</div>
      </div>`);
    function rows(items) {
      return items.length ? items.map((s) => `<tr><td class="whitespace-nowrap">${fmt.datetime(s.paid_at)}</td><td class="font-mono text-xs">${esc(s.number)}</td><td class="font-semibold">${esc(s.title)}</td>
        <td><div>${esc(s.username)}</div><div class="text-xs text-white/40">${esc(s.email || '')}</div></td><td>${s.coupon_code ? `<span class="badge badge-violet">${esc(s.coupon_code)}</span>` : '—'}</td>
        <td class="text-right whitespace-nowrap">${fmt.money(s.price - s.discount)}</td><td class="text-right whitespace-nowrap text-white/50">−${fmt.money(s.fee)}</td><td class="text-right whitespace-nowrap text-emerald-400 font-semibold">${fmt.money(s.net)}</td></tr>`).join('')
        : `<tr><td colspan="8">${h.empty('shopping-bag', 'Brak sprzedaży.')}</td></tr>`;
    }
    P.$('#pf').onchange = async (e) => {
      const r = await api(`/api/seller/sales?product=${e.target.value}`);
      P.$('#rows').innerHTML = rows(r.items); VS.icons();
    };
    P.$$('[data-page]').forEach((b) => b.onclick = () => { try { sessionStorage.setItem('vs_sales_page', b.dataset.page); } catch {} P.views['seller/sales'](); });
  };

  // =================== LICENCJE KLIENTÓW ===================
  P.views['seller/licenses'] = async () => {
    const products = await api('/api/seller/products');
    P.render(`${h.title('Licencje klientów', 'Zarządzaj kluczami: unieważniaj, zmieniaj limity, resetuj aktywacje lub wydawaj licencje ręcznie.', h.btn('Wydaj licencję', 'key-round', 'id="grant"', 'btn-primary'))}
      <div class="glass rounded-3xl p-2 sm:p-4">
        <div class="flex flex-wrap gap-2 p-2">
          <div class="relative"><i data-lucide="search" class="h-4 w-4 absolute left-3 top-3 text-white/40"></i><input id="lq" class="field !pl-9 !py-2 text-sm w-64" placeholder="Klucz, nick lub e-mail"></div>
          <select id="lp" class="field !w-auto text-sm"><option value="">Wszystkie produkty</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Klucz</th><th>Produkt</th><th>Klient</th><th>Aktywacje</th><th>Ostatnio</th><th>Status</th><th></th></tr></thead><tbody id="rows"><tr><td colspan="7"><div class="skeleton h-10"></div></td></tr></tbody></table></div>
      </div>`);
    const load = async () => {
      const list = await api(`/api/seller/licenses?q=${encodeURIComponent(P.$('#lq').value)}&product=${P.$('#lp').value}`);
      P.$('#rows').innerHTML = list.length ? list.map((l) => `<tr>
        <td><button data-copy="${esc(l.license_key)}" class="font-mono text-xs hover:text-white text-white/80">${esc(l.license_key)}</button>${l.note ? `<div class="text-[11px] text-white/40">${esc(l.note)}</div>` : ''}</td>
        <td class="max-w-[180px] truncate">${esc(l.title)}</td><td><div>${esc(l.username)}</div><div class="text-xs text-white/40">${esc(l.email || '')}</div></td>
        <td>${l.activations}/${l.max_activations || '∞'}</td><td class="whitespace-nowrap text-white/60">${l.last_seen ? fmt.rel(l.last_seen) : '—'}</td><td>${h.status(l.status)}</td>
        <td class="text-right whitespace-nowrap">
          <button data-edit='${esc(JSON.stringify({ id: l.id, max: l.max_activations, note: l.note || '' }))}' class="rounded-lg btn-ghost p-2" title="Limit i notatka"><i data-lucide="sliders-horizontal" class="h-4 w-4"></i></button>
          <button data-reset="${l.id}" class="rounded-lg btn-ghost p-2" title="Resetuj aktywacje"><i data-lucide="rotate-ccw" class="h-4 w-4"></i></button>
          <button data-status="${l.id}:${l.status === 'active' ? 'revoked' : 'active'}" class="rounded-lg ${l.status === 'active' ? 'btn-danger' : 'btn-ghost'} p-2" title="${l.status === 'active' ? 'Unieważnij' : 'Przywróć'}"><i data-lucide="${l.status === 'active' ? 'ban' : 'undo-2'}" class="h-4 w-4"></i></button>
        </td></tr>`).join('') : `<tr><td colspan="7">${h.empty('key-round', 'Brak licencji.')}</td></tr>`;
      VS.icons();
      P.$$('[data-copy]').forEach((b) => b.onclick = () => VS.copy(b.dataset.copy));
      P.$$('[data-reset]').forEach((b) => b.onclick = async () => { await P.guard(() => api(`/api/seller/licenses/${b.dataset.reset}/reset`, { method: 'POST' }), 'Aktywacje zresetowane'); load(); });
      P.$$('[data-status]').forEach((b) => b.onclick = async () => {
        const [lid, status] = b.dataset.status.split(':');
        if (status === 'revoked' && !(await VS.confirm('Unieważnić licencję? Plugin klienta przestanie działać, a pobieranie zostanie zablokowane.', { ok: 'Unieważnij', danger: true }))) return;
        await P.guard(() => api('/api/seller/licenses/' + lid, { method: 'PATCH', body: { status } }), status === 'revoked' ? 'Licencja unieważniona' : 'Licencja przywrócona');
        load();
      });
      P.$$('[data-edit]').forEach((b) => b.onclick = () => {
        const l = JSON.parse(b.dataset.edit);
        VS.modal(`<h3 class="text-lg font-bold mb-4">Ustawienia licencji</h3><form class="space-y-3">
          <div><label class="label">Limit aktywacji (0 = bez limitu)</label><input name="max_activations" type="number" min="0" class="field" value="${l.max}"></div>
          <div><label class="label">Notatka (widoczna tylko dla Ciebie)</label><input name="note" class="field" value="${esc(l.note)}" maxlength="200"></div>
          <button class="rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Zapisz</button></form>`, {
          onMount(el, close) {
            el.querySelector('form').onsubmit = async (e) => {
              e.preventDefault();
              await P.guard(() => api('/api/seller/licenses/' + l.id, { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano');
              close(); load();
            };
          },
        });
      });
    };
    let t;
    P.$('#lq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    P.$('#lp').onchange = load;
    P.$('#grant').onclick = () => VS.modal(`<h3 class="text-lg font-bold mb-1">Wydaj licencję ręcznie</h3><p class="text-sm text-white/55 mb-4">Np. dla partnera, testera lub w konkursie. Klient zobaczy produkt w bibliotece.</p>
      <form class="space-y-3"><div><label class="label">Produkt</label><select name="product_id" class="field" required>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
      <div><label class="label">E-mail konta klienta</label><input name="email" type="email" class="field" required></div>
      <div><label class="label">Notatka</label><input name="note" class="field" placeholder="np. Giveaway Discord"></div>
      <button class="rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Wydaj licencję</button></form>`, {
      onMount(el, close) {
        el.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          const r = await P.guard(() => api('/api/seller/licenses', { method: 'POST', body: P.formData(e.target) }));
          toast('Wydano klucz ' + r.license_key, 'ok'); close(); load();
        };
      },
    });
    load();
  };

  // =================== KUPONY ===================
  P.views['seller/coupons'] = async () => {
    const [list, products] = await Promise.all([api('/api/seller/coupons'), api('/api/seller/products')]);
    P.render(`${h.title('Kody rabatowe', 'Rabaty procentowe działają na Twoje produkty w koszyku klienta.')}
      <div class="grid xl:grid-cols-[360px_1fr] gap-6 items-start">
        ${h.card('Nowy kod', `<form id="cf" class="space-y-3">
          <div><label class="label">Kod</label><input name="code" class="field uppercase font-mono" placeholder="LATO25" required maxlength="24"></div>
          <div><label class="label">Rabat (%)</label><input name="percent" type="number" min="1" max="100" class="field" value="10" required></div>
          <div><label class="label">Dotyczy</label><select name="product_id" class="field"><option value="">Wszystkich moich produktów</option>${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Limit użyć</label><input name="max_uses" type="number" min="1" class="field" placeholder="∞"></div>
            <div><label class="label">Ważny do</label><input name="expires_at" type="date" class="field"></div></div>
          <button class="w-full rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold">Utwórz kod</button></form>`)}
        <div class="glass rounded-3xl p-2 sm:p-4">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Kod</th><th>Rabat</th><th>Produkt</th><th>Użycia</th><th>Ważność</th><th>Aktywny</th><th></th></tr></thead><tbody>
          ${list.map((c) => {
            const expired = c.expires_at && c.expires_at < Date.now();
            return `<tr><td class="font-mono font-bold">${esc(c.code)}</td><td>−${c.percent}%</td><td class="text-white/65">${esc(c.product_title || 'Wszystkie')}</td>
            <td>${c.uses}${c.max_uses ? '/' + c.max_uses : ''}</td><td class="${expired ? 'text-[#ff7aa0]' : 'text-white/60'}">${c.expires_at ? fmt.date(c.expires_at) : 'Bezterminowo'}</td>
            <td><label class="inline-flex items-center cursor-pointer"><input type="checkbox" class="check" data-toggle="${c.id}" ${c.active ? 'checked' : ''}></label></td>
            <td class="text-right"><button data-del="${c.id}" class="rounded-lg btn-ghost p-2" title="Usuń"><i data-lucide="trash-2" class="h-4 w-4"></i></button></td></tr>`;
          }).join('')}</tbody></table></div>` : h.empty('ticket-percent', 'Brak kodów rabatowych.')}</div>
      </div>`);
    P.$('#cf').onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/coupons', { method: 'POST', body: P.formData(e.target) }), 'Kod utworzony'); P.views['seller/coupons'](); };
    P.$$('[data-toggle]').forEach((c) => c.onchange = () => api('/api/seller/coupons/' + c.dataset.toggle, { method: 'PATCH', body: { active: c.checked } }).then(() => toast(c.checked ? 'Kod aktywny' : 'Kod wyłączony', 'ok')));
    P.$$('[data-del]').forEach((b) => b.onclick = async () => { await api('/api/seller/coupons/' + b.dataset.del, { method: 'DELETE' }); P.views['seller/coupons'](); });
  };

  // =================== RECENZJE ===================
  P.views['seller/reviews'] = async () => {
    const list = await api('/api/seller/reviews');
    const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    P.render(`${h.title('Recenzje', `${list.length} opinii • średnia ${avg ? avg.toFixed(2) : '–'}`)}
      <div class="space-y-3">${list.length ? list.map((r) => `<div class="glass rounded-2xl p-4">
        <div class="flex flex-wrap items-center gap-3">${h.avatar(r)}<div><div class="font-semibold text-sm">${esc(r.username)}</div><div class="flex items-center gap-2">${VS.stars(r.rating, 'h-3 w-3')}<span class="text-xs text-white/40">${fmt.rel(r.created_at)}</span></div></div>
          <a href="/produkt/${esc(r.slug)}#recenzje" target="_blank" class="ml-auto chip hover:text-white">${esc(r.title)}</a></div>
        ${r.comment ? `<p class="text-sm text-white/75 mt-3">${esc(r.comment)}</p>` : ''}</div>`).join('') : h.card('', h.empty('star', 'Brak recenzji.'))}</div>`);
  };

  // =================== WYPŁATY ===================
  P.views['seller/payouts'] = async () => {
    const d = await api('/api/seller/payouts');
    const methods = { bank: 'Przelew bankowy', paypal: 'PayPal', revolut: 'Revolut' };
    P.render(`${h.title('Wypłaty', `Minimalna kwota wypłaty: ${fmt.money(d.min_payout)}`)}
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        ${h.kpi('Dostępne', fmt.money(d.balance.available), 'wallet')}${h.kpi('W realizacji', fmt.money(d.balance.pending), 'clock')}
        ${h.kpi('Wypłacone', fmt.money(d.balance.paid_out), 'check-circle-2')}${h.kpi('Zarobione łącznie', fmt.money(d.balance.earned), 'banknote')}
      </div>
      <div class="grid xl:grid-cols-[380px_1fr] gap-6 mt-6 items-start">
        ${h.card('Zleć wypłatę', d.method ? `<form id="po" class="space-y-3">
            <div class="glass-soft rounded-xl p-3 text-sm"><div class="text-xs text-white/50">Metoda</div><div class="font-semibold">${esc(methods[d.method] || d.method)}</div><div class="text-xs text-white/55 font-mono truncate">${esc(d.details || '')}</div></div>
            <div><label class="label">Kwota (zł)</label><input name="amount_pln" type="number" step="0.01" min="${d.min_payout / 100}" max="${d.balance.available / 100}" class="field" value="${(d.balance.available / 100).toFixed(2)}"></div>
            <button class="w-full rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold" ${d.balance.available < d.min_payout ? 'disabled' : ''}>Wypłać</button>
            <a href="#/seller/store" class="block text-center text-xs text-white/50 hover:text-white">Zmień metodę wypłaty</a></form>`
          : h.empty('landmark', 'Ustaw metodę wypłaty, aby wypłacać środki.', '<a href="#/seller/store" class="inline-flex rounded-xl btn-primary px-4 py-2 text-sm font-semibold">Ustawienia sklepu</a>'))}
        <div class="glass rounded-3xl p-2 sm:p-4">${d.history.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Kwota</th><th>Metoda</th><th>Status</th><th>Zrealizowano</th></tr></thead><tbody>
          ${d.history.map((p) => `<tr><td>${fmt.datetime(p.created_at)}</td><td class="font-semibold">${fmt.money(p.amount)}</td><td>${esc(methods[p.method] || p.method || '')}</td><td>${h.status(p.status === 'paid' ? 'paid' : p.status)}</td><td class="text-white/55">${p.processed_at ? fmt.date(p.processed_at) : '—'}</td></tr>`).join('')}
          </tbody></table></div>` : h.empty('history', 'Brak wypłat.')}</div>
      </div>`);
    const f = P.$('#po');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/seller/payouts', { method: 'POST', body: P.formData(e.target) }), 'Zlecenie wypłaty przyjęte'); P.views['seller/payouts'](); };
  };

  // =================== USTAWIENIA SKLEPU ===================
  P.views['seller/store'] = async () => {
    await P.refreshMe();
    const me = VS.me;
    P.render(`${h.title('Ustawienia sklepu', `Publiczny profil: <a class="text-[var(--accent)] hover:underline" href="/tworca/${esc(me.store_slug)}" target="_blank">/tworca/${esc(me.store_slug)}</a>`)}
      <form id="sf" class="grid xl:grid-cols-2 gap-6 items-start">
        ${h.card('Profil sklepu', `<div class="space-y-4">
          <div><label class="label">Nazwa sklepu</label><input name="store_name" class="field" value="${esc(me.store_name)}" maxlength="40" required></div>
          <div><label class="label">Opis sklepu</label><textarea name="bio" rows="5" class="field" maxlength="500" placeholder="Czym się zajmujesz, jakie wsparcie oferujesz…">${esc(me.bio || '')}</textarea></div>
          <p class="text-xs text-white/45">Avatar sklepu to Twój avatar konta — zmienisz go w ustawieniach konta.</p></div>`)}
        ${h.card('Wypłaty', `<div class="space-y-4">
          <div><label class="label">Metoda wypłaty</label><select name="payout_method" class="field">
            <option value="">— wybierz —</option>
            <option value="bank" ${me.payout_method === 'bank' ? 'selected' : ''}>Przelew bankowy (IBAN)</option>
            <option value="paypal" ${me.payout_method === 'paypal' ? 'selected' : ''}>PayPal (e-mail)</option>
            <option value="revolut" ${me.payout_method === 'revolut' ? 'selected' : ''}>Revolut (@tag)</option></select></div>
          <div><label class="label">Dane do wypłaty</label><input name="payout_details" class="field font-mono" value="${esc(me.payout_details || '')}" maxlength="120" placeholder="PL00 0000 …"></div>
          <button class="rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold">Zapisz ustawienia</button></div>`)}
      </form>`);
    P.$('#sf').onsubmit = async (e) => {
      e.preventDefault();
      await P.guard(() => api('/api/seller/store', { method: 'PATCH', body: P.formData(e.target) }), 'Zapisano');
      P.refreshMe();
    };
  };
})();
