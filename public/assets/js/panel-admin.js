/* Velorie Store — administracja platformy */
(function () {
  const { api, esc, fmt, icon } = VS;
  const P = window.Panel;
  const h = P.h;

  P.views['admin/overview'] = async () => {
    const d = await api('/api/admin/overview');
    P.render(`${h.head('Platforma', 'Najważniejsze liczby Velorie Store.')}
      <div class="kpis">
        ${h.kpi('Obrót (GMV)', fmt.money(d.gmv), 'banknote')}
        ${h.kpi('Przychód platformy', fmt.money(d.fees), 'landmark')}
        ${h.kpi('Opłacone zamówienia', fmt.num(d.orders), 'receipt')}
        ${h.kpi('Wypłaty do realizacji', fmt.money(d.pending_payouts_amount), 'clock', { hint: `${d.pending_payouts} ${fmt.plural(d.pending_payouts, 'zlecenie', 'zlecenia', 'zleceń')}` })}
        ${h.kpi('Użytkownicy', fmt.num(d.users), 'users')}
        ${h.kpi('Twórcy', fmt.num(d.sellers), 'store')}
        ${h.kpi('Produkty', fmt.num(d.products), 'package')}
        ${h.kpi('Opublikowane', fmt.num(d.published), 'eye')}
      </div>
      <div class="grid g-3 mt-6">
        <a href="#/admin/payouts" class="card card-pad card-hover row gap-4"><span class="icon-box brand">${icon('banknote')}</span><div><div class="strong">Realizuj wypłaty</div><div class="small subtle">${d.pending_payouts} oczekujących</div></div></a>
        <a href="#/admin/products" class="card card-pad card-hover row gap-4"><span class="icon-box">${icon('layers')}</span><div><div class="strong">Moderacja produktów</div><div class="small subtle">Blokady i wyróżnienia</div></div></a>
        <a href="#/admin/infobar" class="card card-pad card-hover row gap-4"><span class="icon-box">${icon('megaphone')}</span><div><div class="strong">Komunikat na stronie</div><div class="small subtle">Pasek nad nagłówkiem</div></div></a>
      </div>`);
  };

  P.views['admin/products'] = async () => {
    P.render(`${h.head('Moderacja produktów', 'Blokuj naruszenia i wyróżniaj produkty na stronie głównej.', h.search('aq', 'Szukaj produktu lub twórcy'))}
      <section class="card" style="overflow:hidden"><div class="table-wrap"><table class="table"><thead><tr><th>Produkt</th><th>Twórca</th><th class="num">Cena</th><th class="num">Sprzedaże</th><th>Status</th><th>Polecany</th></tr></thead><tbody id="rows"></tbody></table></div></section>`);
    const load = async () => {
      const list = await api('/api/admin/products?q=' + encodeURIComponent(P.$('#aq').value));
      P.$('#rows').innerHTML = list.map((p) => `<tr><td><a href="/produkt/${esc(p.slug)}" target="_blank" class="strong">${esc(p.title)}</a><div class="xs subtle">${esc(VS.CAT_NAMES[p.category] || p.category)} · ${fmt.date(p.created_at)}</div></td>
        <td>${esc(p.store_name)}</td><td class="num">${fmt.price(p.price)}</td><td class="num">${p.sales}</td>
        <td><select data-status="${p.id}" class="select input-sm" style="width:auto">${['published', 'draft', 'blocked'].map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${{ published: 'Opublikowany', draft: 'Szkic', blocked: 'Zablokowany' }[s]}</option>`).join('')}</select></td>
        <td><label class="switch"><input type="checkbox" data-feat="${p.id}" ${p.featured ? 'checked' : ''} aria-label="Polecany"></label></td></tr>`).join('') || `<tr><td colspan="6">${h.empty('search', 'Brak wyników')}</td></tr>`;
      P.$$('[data-status]').forEach((s) => s.onchange = () => P.guard(() => api('/api/admin/products/' + s.dataset.status, { method: 'PATCH', body: { status: s.value } }), 'Status zmieniony'));
      P.$$('[data-feat]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/products/' + c.dataset.feat, { method: 'PATCH', body: { featured: c.checked } }), c.checked ? 'Produkt wyróżniony' : 'Usunięto wyróżnienie'));
    };
    let t; P.$('#aq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    load();
  };

  P.views['admin/users'] = async () => {
    P.render(`${h.head('Użytkownicy', 'Uprawnienia administratorów i blokady kont.', h.search('aq', 'E-mail lub nazwa'))}
      <section class="card" style="overflow:hidden"><div class="table-wrap"><table class="table"><thead><tr><th>Użytkownik</th><th>Logowanie</th><th>Rola</th><th class="num">Zamówienia</th><th>Dołączył</th><th>Admin</th><th>Zablokowany</th></tr></thead><tbody id="rows"></tbody></table></div></section>`);
    const load = async () => {
      const list = await api('/api/admin/users?q=' + encodeURIComponent(P.$('#aq').value));
      P.$('#rows').innerHTML = list.map((u) => `<tr><td><div class="row gap-3">${VS.avatar(u, 'avatar-sm')}<div><div class="strong small">${esc(u.username)}</div><div class="xs subtle">${esc(u.email || '—')}</div></div></div></td>
        <td class="row gap-2" style="border:0">${u.email ? `<span title="E-mail">${icon('mail', 'i-sm subtle')}</span>` : ''}${u.google ? `<span title="Google">${icon('google', 'i-sm')}</span>` : ''}${u.discord ? `<span title="Discord" style="color:#8b94ff">${icon('discord', 'i-sm')}</span>` : ''}</td>
        <td>${u.is_seller ? `<span class="badge badge-violet">Twórca · ${esc(u.store_name)}</span>` : '<span class="badge">Klient</span>'}</td>
        <td class="num">${u.orders}</td><td class="nowrap">${fmt.date(u.created_at)}</td>
        <td><label class="switch"><input type="checkbox" data-admin="${u.id}" ${u.is_admin ? 'checked' : ''} ${u.id === VS.me.id ? 'disabled' : ''}></label></td>
        <td><label class="switch"><input type="checkbox" data-ban="${u.id}" ${u.banned ? 'checked' : ''} ${u.id === VS.me.id ? 'disabled' : ''}></label></td></tr>`).join('');
      P.$$('[data-admin]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/users/' + c.dataset.admin, { method: 'PATCH', body: { is_admin: c.checked } }), 'Uprawnienia zapisane'));
      P.$$('[data-ban]').forEach((c) => c.onchange = () => P.guard(() => api('/api/admin/users/' + c.dataset.ban, { method: 'PATCH', body: { banned: c.checked } }), c.checked ? 'Konto zablokowane' : 'Konto odblokowane'));
    };
    let t; P.$('#aq').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
    load();
  };

  P.views['admin/payouts'] = async () => {
    const list = await api('/api/admin/payouts');
    const methods = { bank: 'Przelew', paypal: 'PayPal', revolut: 'Revolut' };
    P.render(`${h.head('Wypłaty twórców', 'Po wykonaniu przelewu oznacz zlecenie jako wypłacone.')}
      <section class="card" style="overflow:hidden">${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Twórca</th><th class="num">Kwota</th><th>Dane do wypłaty</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td class="nowrap">${fmt.datetime(p.created_at)}</td><td><div class="strong small">${esc(p.store_name)}</div><div class="xs subtle">${esc(p.email || '')}</div></td>
          <td class="num strong">${fmt.money(p.amount)}</td><td><div class="small">${esc(methods[p.method] || p.method || '')}</div><div class="xs mono subtle">${esc(p.details || '')}</div></td><td>${h.status(p.status === 'paid' ? 'payout_paid' : p.status)}</td>
          <td class="text-right nowrap">${p.status === 'pending' ? `<button data-set="${p.id}:rejected" class="btn btn-ghost btn-sm">Odrzuć</button> <button data-set="${p.id}:paid" class="btn btn-success btn-sm">${icon('check', 'i-sm')}Wypłacone</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : h.empty('banknote', 'Brak zleceń wypłat')}</section>`);
    P.$$('[data-set]').forEach((b) => b.onclick = async () => {
      const [id, status] = b.dataset.set.split(':');
      await P.guard(() => api('/api/admin/payouts/' + id, { method: 'PATCH', body: { status } }), status === 'paid' ? 'Oznaczono jako wypłacone' : 'Zlecenie odrzucone');
      P.views['admin/payouts']();
    });
  };

  P.views['admin/infobar'] = async () => {
    const d = await api('/api/admin/infobar');
    P.render(`${h.head('Komunikat na stronie', 'Pasek wyświetlany nad nagłówkiem na wszystkich stronach sklepu.')}
      <div class="half" style="align-items:start">
        ${h.card('Treść', `<form id="ib" class="stack">
          <label class="switch"><input type="checkbox" name="isActive" ${d.isActive ? 'checked' : ''}><span class="strong small">Wyświetlaj komunikat</span></label>
          <div><label class="label">Tekst</label><input name="text" class="input" value="${esc(d.text || '')}" maxlength="200"></div>
          <div class="form-grid"><div><label class="label">Kolor tła</label><input name="bgColor" type="color" class="input" style="padding:4px" value="${esc(d.bgColor || '#ff0354')}"></div>
            <div><label class="label">Kolor tekstu</label><input name="textColor" type="color" class="input" style="padding:4px" value="${esc(d.textColor || '#ffffff')}"></div>
            <div><label class="label">Link</label><input name="linkUrl" class="input" value="${esc(d.linkUrl || '')}" placeholder="/sklep.html"></div>
            <div><label class="label">Tekst linku</label><input name="linkText" class="input" value="${esc(d.linkText || '')}" maxlength="40"></div></div>
          <div class="row end"><button class="btn btn-primary">Zapisz</button></div></form>`)}
        ${h.card('Podgląd', '<div id="prev" class="announce" style="border-radius:10px"></div>')}
      </div>`);
    const f = P.$('#ib');
    const prev = () => {
      const v = P.formData(f), el = P.$('#prev');
      el.style.background = v.bgColor; el.style.color = v.textColor; el.style.opacity = v.isActive ? 1 : 0.4;
      el.innerHTML = `<span>${esc(v.text)}</span>${v.linkText ? `<a>${esc(v.linkText)}${icon('arrow-right', 'i-sm')}</a>` : ''}`;
    };
    f.oninput = prev; prev();
    f.onsubmit = async (e) => { e.preventDefault(); await P.guard(() => api('/api/admin/infobar', { method: 'PUT', body: P.formData(f) }), 'Komunikat zapisany'); };
  };
})();
