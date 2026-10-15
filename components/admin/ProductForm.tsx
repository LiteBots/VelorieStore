'use client';

import { useState } from 'react';
import { saveProduct } from '@/lib/actions/admin';
import { ActionForm, Submit } from '../Forms';
import { CATS, catOf } from '@/lib/catalog';
import { ProductArt } from '../ProductArt';

const ARTS = ['sword', 'swords', 'shield', 'chest', 'lobby', 'medieval', 'setup', 'police', 'hospital', 'club', 'garage', 'vault', 'city', 'race', 'car', 'logo', 'mcTile', 'tablet', 'hud', 'chat', 'browser'];

export function ProductForm({ p, sellers }: { p?: any; sellers: { slug: string; name: string }[] }) {
  const [art, setArt] = useState(p?.art || 'shield');
  const [cat, setCat] = useState(p?.cat || 'mc-plugin');
  const [name, setName] = useState(p?.name || '');
  const [img, setImg] = useState(p?.imageUrl || '');
  return (
    <div className="sell-grid">
      <ActionForm action={saveProduct} className="panel form" resetOnOk={false} style={{ padding: 'clamp(18px,2.4vw,28px)' }}>
        {p?._id && <input type="hidden" name="_id" value={p._id} />}
        <div className="field"><label>Nazwa</label><input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Identyfikator (slug)</label><input name="slug" required pattern="[a-z0-9-]+" maxLength={80} defaultValue={p?.slug} readOnly={!!p?._id} /><small>Małe litery, cyfry i myślniki. Używany też w API licencji.</small></div>
        <div className="field"><label>Kategoria</label><select name="cat" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c.id} value={c.id}>{c.full}</option>)}</select></div>
        <div className="field"><label>Twórca</label><select name="seller" defaultValue={p?.seller || sellers[0]?.slug}>{sellers.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></div>
        <div className="field"><label>Cena Standard (zł)</label><input name="price" type="number" min={1} max={20000} step="0.01" required defaultValue={p?.price} /></div>
        <div className="field"><label>Cena przed promocją (zł)</label><input name="oldPrice" type="number" min={0} step="0.01" defaultValue={p?.oldPrice || ''} /></div>
        <div className="field"><label>Odznaka</label><select name="badge" defaultValue={p?.badge || ''}><option value="">brak</option><option value="bestseller">Bestseller</option><option value="nowość">Nowość</option><option value="promocja">Promocja</option></select></div>
        <div className="field"><label>Grafika (render)</label><select name="art" value={art} onChange={(e) => setArt(e.target.value)}>{ARTS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
        <div className="field"><label>Wersja</label><input name="version" required maxLength={20} defaultValue={p?.version || '1.0.0'} /></div>
        <div className="field"><label>Zgodność</label><input name="compat" maxLength={80} defaultValue={p?.compat} placeholder="ESX · QBCore · QBox" /></div>
        <div className="field"><label>Typ plików</label><input name="type" maxLength={40} defaultValue={p?.type} placeholder="Escrow / Plugin .jar / MLO" /></div>
        <div className="field"><label>Resmon (FiveM)</label><input name="resmon" maxLength={20} defaultValue={p?.resmon || ''} placeholder="0.01 ms" /></div>
        <div className="field full"><label>Technologie (po przecinku)</label><input name="tech" maxLength={300} defaultValue={(p?.tech || []).join(', ')} placeholder="Paper, Folia" /></div>
        <div className="field full"><label>Krótki opis (karta produktu)</label><textarea name="desc" maxLength={240} required defaultValue={p?.desc} style={{ minHeight: 80 }} /></div>
        <div className="field full"><label>Pełny opis</label><textarea name="longDesc" maxLength={6000} defaultValue={p?.longDesc} /><small>Akapity oddzielaj pustą linią.</small></div>
        <div className="field full"><label>Funkcje (jedna w linii)</label><textarea name="feats" maxLength={3000} defaultValue={(p?.feats || []).join('\n')} /></div>
        <div className="field full"><label>Własna grafika (URL, opcjonalnie)</label><input name="imageUrl" maxLength={400} value={img} onChange={(e) => setImg(e.target.value)} placeholder="/produkty/nazwa.webp lub https://cdn.discordapp.com/…" /><small>Pliki możesz wrzucić do folderu <code>public/produkty</code> w repozytorium.</small></div>
        <div className="field full"><label>Prywatny link do pliku (pobieranie)</label><input name="downloadUrl" maxLength={600} placeholder={p?._id ? 'pozostaw puste, aby nie zmieniać' : 'https://… (np. link z GitHub Releases, S3, R2)'} /><small>Nigdy nie trafia do przeglądarki — serwer pobiera plik i przekazuje go tylko właścicielom licencji.</small>
          {p?._id && <label className="check" style={{ marginTop: 6 }}><input type="checkbox" name="clearDownload" />Usuń obecny plik</label>}
        </div>
        {p?._id && <div className="field full"><label>Notatki do wydania (changelog)</label><textarea name="releaseNotes" maxLength={2000} placeholder="Jedna zmiana w linii — dodane, gdy zmienisz wersję" style={{ minHeight: 80 }} /></div>}
        <label className="check field full"><input type="checkbox" name="published" defaultChecked={p ? p.published : true} />Opublikowany w sklepie</label>
        <div className="field full" style={{ alignItems: 'flex-start' }}><Submit className="btn btn-primary btn-lg">{p?._id ? 'Zapisz zmiany' : 'Dodaj produkt'}</Submit></div>
      </ActionForm>
      <div className="preview-sticky">
        <span className="eyebrow">Podgląd grafiki</span>
        <div className="card" style={{ pointerEvents: 'none' }}>
          <div className="thumb"><ProductArt p={{ id: 'admin-' + art, art, plat: catOf(cat).plat, name, imageUrl: img || null }} /></div>
          <div className="card-body"><h3>{name || 'Nazwa produktu'}</h3><p className="desc">{catOf(cat).full}</p></div>
        </div>
      </div>
    </div>
  );
}
