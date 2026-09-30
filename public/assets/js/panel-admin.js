/* Velorie Store — administracja platformy */
(function () {
  const { api, esc, fmt } = VS;
  const P = window.Panel;
  const h = P.h;

  P.views['admin/overview'] = async () => {
    const d = await api('/api/admin/overview');
    P.render(`${h.title('Platforma', 'Kluczowe liczby Velorie Store')}
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        ${h.kpi('Obrót (GMV)', fmt.money(d.gmv), 'banknote')}
        ${h.kpi('Przychód platformy', fmt.money(d.fees), 'landmark')}
        ${h.kpi('Zamówienia', fmt.num(d.orders), 'receipt')}
        ${h.kpi('Wypłaty do realizacji', fmt.money(d.pending_payouts_amount), 'clock', { hint: `${d.pending_payouts} zleceń` })}
        ${h.kpi('Użytkownicy', fmt.num(d.users), 'users')}
        ${h.kpi('Twórcy', fmt.num(d.sellers), 'briefcase')}
        ${h.kpi('Produkty', fmt.num(d.products), 'package')}
        ${h.kpi('Opublikowane', fmt.num(d.published), 'eye')}
      </div>`);
  };

  P.views['admin/products'] = async () => {
    P.render(`${h.title('Produkty', 'Moderacja i wyróżnienia na stronie głównej',
      '<div class="relative"><i data-lucide="search" class="h-4 w-4 absolute left-3 top-3 text-white/40"></i><input id="aq" class="field !pl-9 !py-2 text-sm w-60" placeholder="Szukaj"></div>')}
      <div class="glass rounded-3xl p-2 sm:p-4"><div class="table-wrap"><table class="table"><thead><tr><th>Produkt</th><th>Twórca</th><th>Cena</th><th>Sprzedaże</th><th>Status</th><th>Polecany</th></tr></thead><tbody id="rows"></tbody></table></div></div>`);
    const load = async () => {
      const list = await api('/api/admin/products?q=' + encodeURIComponent(P.$('#aq').value));
      P.$('#rows').innerHTML = list.map((p) => `<tr><td><a href="/produkt/${esc(p.slug)}" target="_blank" class="font-semibold hover:underline">${esc(p.title)}</a><div class="text-xs text-white/40">${esc(VS.CAT_NAMES[p.category] || p.category)} • ${fmt.date(p.created_at)}</div></td>
        <td>${esc(p.store_name)}</td><td>${fmt.price(p.price)}</td><td>${p.sales}</td>
        <td><select data-status="${p.id}" class="field !py-1.5 !w-auto text-xs">${['published', 'draft', 'blocked'].map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${{ published: 'Opublikowany', draft: 'Szkic', blocked: 'Zablokowany' }[s]}</option>`).join('')}</select></td>
        <td><input type="checkbox" class="check" data-feat="${p.id}" ${p.featured ? 'checked' : ''}></td></tr>`).join('');
      P.$$('[data-status]').forEach((s) => s.onchange = () => P.guard(() => api('/api/admin/products/' + s.dataset.status, { method: 'PATCH', body: { status: s.value } }), 'Zapisano'));
      P.$$('[data-feat]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/products/' + c.dataset.feat, { method: 'PATCH', body: { featured: c.checked } }), 'Zapisano'));
    };
    let t; P.$('#aq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    load();
  };

  P.views['admin/users'] = async () => {
    P.render(`${h.title('Użytkownicy', '',
      '<div class="relative"><i data-lucide="search" class="h-4 w-4 absolute left-3 top-3 text-white/40"></i><input id="aq" class="field !pl-9 !py-2 text-sm w-60" placeholder="E-mail lub nick"></div>')}
      <div class="glass rounded-3xl p-2 sm:p-4"><div class="table-wrap"><table class="table"><thead><tr><th>Użytkownik</th><th>Logowanie</th><th>Rola</th><th>Zamówienia</th><th>Dołączył</th><th>Admin</th><th>Blokada</th></tr></thead><tbody id="rows"></tbody></table></div></div>`);
    const load = async () => {
      const list = await api('/api/admin/users?q=' + encodeURIComponent(P.$('#aq').value));
      P.$('#rows').innerHTML = list.map((u) => `<tr><td><div class="font-semibold">${esc(u.username)}</div><div class="text-xs text-white/40">${esc(u.email || '—')}</div></td>
        <td class="text-xs text-white/60">${[u.email && 'e-mail', u.google && 'Google', u.discord && 'Discord'].filter(Boolean).join(', ')}</td>
        <td>${u.is_seller ? `<span class="badge badge-violet">Twórca: ${esc(u.store_name)}</span>` : '<span class="badge badge-gray">Kupujący</span>'}</td>
        <td>${u.orders}</td><td class="text-white/55">${fmt.date(u.created_at)}</td>
        <td><input type="checkbox" class="check" data-admin="${u.id}" ${u.is_admin ? 'checked' : ''} ${u.id === VS.me.id ? 'disabled' : ''}></td>
        <td><input type="checkbox" class="check" data-ban="${u.id}" ${u.banned ? 'checked' : ''} ${u.id === VS.me.id ? 'disabled' : ''}></td></tr>`).join('');
      P.$$('[data-admin]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/users/' + c.dataset.admin, { method: 'PATCH', body: { is_admin: c.checked } }), 'Zapisano'));
      P.$$('[data-ban]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/users/' + c.dataset.ban, { method: 'PATCH', body: { banned: c.checked } }), c.checked ? 'Użytkownik zablokowany' : 'Odblokowano'));
    };
    let t; P.$('#aq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    load();
  };

  P.views['admin/payouts'] = async () => {
    const list = await api('/api/admin/payouts');
    P.render(`${h.title('Wypłaty twórców', 'Po wykonaniu przelewu oznacz zlecenie jako wypłacone.')}
      <div class="glass rounded-3xl p-2 sm:p-4">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Twórca</th><th>Kwota</th><th>Metoda / dane</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td>${fmt.datetime(p.created_at)}</td><td><div class="font-semibold">${esc(p.store_name)}</div><div class="text-xs text-white/40">${esc(p.email || '')}</div></td>
          <td class="font-bold">${fmt.money(p.amount)}</td><td><div>${esc(p.method || '')}</div><div class="text-xs font-mono text-white/50">${esc(p.details || '')}</div></td><td>${h.status(p.status)}</td>
          <td class="text-right whitespace-nowrap">${p.status === 'pending' ? `<button data-set="${p.id}:paid" class="rounded-lg btn-primary px-3 py-1.5 text-xs font-semibold">Wypłacone</button> <button data-set="${p.id}:rejected" class="rounded-lg btn-danger px-3 py-1.5 text-xs">Odrzuć</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : h.empty('banknote', 'Brak zleceń wypłat.')}</div>`);
    P.$$('[data-set]').forEach((b) => b.onclick = async () => {
      const [id, status] = b.dataset.set.split(':');
      await P.guard(() => api('/api/admin/payouts/' + id, { method: 'PATCH', body: { status } }), 'Zapisano');
      P.views['admin/payouts']();
    });
  };

  P.views['admin/infobar'] = async () => {
    const d = await api('/api/admin/infobar');
    P.render(`${h.title('Pasek informacyjny', 'Komunikat wyświetlany na górze wszystkich stron sklepu.')}
      <div class="grid xl:grid-cols-2 gap-6 items-start">
        ${h.card('Treść', `<form id="ib" class="space-y-4">
          <label class="flex items-center gap-2"><input type="checkbox" name="isActive" class="check" ${d.isActive ? 'checked' : ''}>Pasek włączony</label>
          <div><label class="label">Tekst</label><input name="text" class="field" value="${esc(d.text || '')}" maxlength="200"></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Tło</label><input name="bgColor" type="color" class="field !p-1 h-11" value="${esc(d.bgColor || '#ff0354')}"></div>
            <div><label class="label">Tekst</label><input name="textColor" type="color" class="field !p-1 h-11" value="${esc(d.textColor || '#ffffff')}"></div></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="label">Link (URL)</label><input name="linkUrl" class="field" value="${esc(d.linkUrl || '')}" placeholder="/sklep.html"></div>
            <div><label class="label">Tekst linku</label><input name="linkText" class="field" value="${esc(d.linkText || '')}" maxlength="40"></div></div>
          <button class="rounded-xl btn-primary px-5 py-2.5 text-sm font-semibold">Zapisz</button></form>`)}
        ${h.card('Podgląd', '<div id="prev" class="rounded-xl px-4 py-2.5 text-center text-sm font-medium"></div>')}
      </div>`);
    const f = P.$('#ib');
    const prev = () => { const v = P.formData(f); const el = P.$('#prev'); el.style.background = v.bgColor; el.style.color = v.textColor; el.innerHTML = `${esc(v.text)} ${v.linkText ? `<span class="ml-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase">${esc(v.linkText)}</span>` : ''}`; el.style.opacity = v.isActive ? 1 : 0.4; };
    f.oninput = prev; prev();
    f.onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/admin/infobar', { method: 'PUT', body: P.formData(f) }), 'Pasek zapisany'); };
  };
})();
