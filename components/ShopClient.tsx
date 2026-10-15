'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CATS, PLATS, catOf, plural, zl, type Plat } from '@/lib/catalog';
import type { ProductDTO, SellerDTO } from '@/lib/types';
import { Icon } from './Icon';
import { ProductCard } from './ProductCard';
import { useStore } from './Store';

type Sort = 'pop' | 'new' | 'rate' | 'asc' | 'desc';
interface Init { plat?: string; cat?: string; q?: string }

export function ShopClient({ products, sellers, init, title, intro }: { products: ProductDTO[]; sellers: Record<string, SellerDTO>; init: Init; title: string; intro?: string }) {
  const { wish } = useStore();
  const maxPrice = Math.max(400, ...products.map((p) => Math.ceil(p.price / 10) * 10));
  const [plat, setPlat] = useState<string>(init.plat || 'all');
  const [cat, setCat] = useState<string>(init.cat || 'all');
  const [tech, setTech] = useState<string[]>([]);
  const [max, setMax] = useState(maxPrice);
  const [rating, setRating] = useState(0);
  const [official, setOfficial] = useState(false);
  const [onlyWish, setOnlyWish] = useState(false);
  const [q, setQ] = useState(init.q || '');
  const [sort, setSort] = useState<Sort>('pop');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [side, setSide] = useState(false);

  const reset = () => { setPlat('all'); setCat('all'); setTech([]); setMax(maxPrice); setRating(0); setOfficial(false); setOnlyWish(false); setQ(''); };

  const inPlat = products.filter((p) => plat === 'all' || p.plat === plat);
  const techs = [...new Set(inPlat.filter((p) => cat === 'all' || p.cat === cat).flatMap((p) => p.tech))];

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    const sorters: Record<Sort, (a: ProductDTO, b: ProductDTO) => number> = {
      pop: (a, b) => b.sales - a.sales,
      new: (a, b) => b.updated.localeCompare(a.updated),
      rate: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      asc: (a, b) => a.price - b.price,
      desc: (a, b) => b.price - a.price,
    };
    return products.filter((p) => {
      if (plat !== 'all' && p.plat !== plat) return false;
      if (cat !== 'all' && p.cat !== cat) return false;
      if (tech.length && !p.tech.some((t) => tech.includes(t))) return false;
      if (p.price > max) return false;
      if (p.rating < rating) return false;
      if (official && !sellers[p.seller]?.official) return false;
      if (onlyWish && !wish.includes(p.slug)) return false;
      if (s) {
        const hay = [p.name, p.desc, p.type, p.compat, catOf(p.cat).full, sellers[p.seller]?.name || '', ...p.tech, ...p.feats].join(' ').toLowerCase();
        if (!s.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    }).sort(sorters[sort]);
  }, [products, plat, cat, tech, max, rating, official, onlyWish, q, sort, sellers, wish]);

  const chips: [string, string, () => void][] = [];
  if (plat !== 'all') chips.push(['plat', PLATS[plat as Plat], () => { setPlat('all'); setCat('all'); }]);
  if (cat !== 'all') chips.push(['cat', catOf(cat).full, () => setCat('all')]);
  tech.forEach((t) => chips.push(['t' + t, t, () => setTech((x) => x.filter((y) => y !== t))]));
  if (max < maxPrice) chips.push(['max', 'do ' + zl(max), () => setMax(maxPrice)]);
  if (rating) chips.push(['rate', 'ocena ' + String(rating).replace('.', ',') + '+', () => setRating(0)]);
  if (official) chips.push(['off', 'Velorie Studio', () => setOfficial(false)]);
  if (onlyWish) chips.push(['wish', 'Ulubione', () => setOnlyWish(false)]);
  if (q) chips.push(['q', `„${q}”`, () => setQ('')]);

  return (
    <div className="view wrap">
      <div className="ph" style={{ paddingBottom: 24 }}>
        <nav className="crumbs" aria-label="Okruszki"><Link href="/">Start</Link><Icon name="right" /><Link href="/sklep">Sklep</Link>{init.cat && <><Icon name="right" /><span>{title}</span></>}</nav>
        <h1 style={{ fontSize: 'clamp(32px,4.4vw,52px)' }}>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      <div className="shop">
        <div className={`scrim ${side ? 'on' : ''}`} onClick={() => setSide(false)} style={{ zIndex: 65 }} />
        <aside className={`side ${side ? 'on' : ''}`} aria-label="Filtry">
          <div className="fg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 0 }}>
            <b style={{ fontSize: 16 }}>Filtry</b><button className="btn btn-sm btn-ghost" onClick={reset}>Wyczyść</button>
          </div>
          <div className="fg">
            <h4>Platforma</h4>
            <div className="chips">
              {[['all', 'Wszystkie'], ['minecraft', 'Minecraft'], ['fivem', 'FiveM'], ['other', 'Discord i web']].map(([v, l]) => (
                <button key={v} className={`chip ${plat === v ? 'on' : ''}`} onClick={() => { setPlat(v); setCat('all'); setTech([]); }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="fg">
            <h4>Kategoria</h4>
            <div className="fl">
              <button className={`fi ${cat === 'all' ? 'on' : ''}`} onClick={() => { setCat('all'); setTech([]); }}><Icon name="grid" />Wszystkie<small>{inPlat.length}</small></button>
              {CATS.filter((c) => plat === 'all' || c.plat === plat).map((c) => (
                <button key={c.id} className={`fi ${cat === c.id ? 'on' : ''}`} onClick={() => { setCat(c.id); setPlat(c.plat); setTech([]); }}>
                  <Icon name={c.icon} />{c.full}<small>{products.filter((p) => p.cat === c.id).length}</small>
                </button>
              ))}
            </div>
          </div>
          {techs.length > 0 && (
            <div className="fg">
              <h4>Technologia</h4>
              <div className="chips">
                {techs.map((t) => (
                  <button key={t} className={`chip ${tech.includes(t) ? 'on' : ''}`} onClick={() => setTech((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div className="fg">
            <h4>Cena do <span className="mono" style={{ color: 'var(--fg)', letterSpacing: 0 }}>{zl(max)}</span></h4>
            <input type="range" min={30} max={maxPrice} step={10} value={max} aria-label="Maksymalna cena"
              style={{ ['--p' as any]: `${((max - 30) / (maxPrice - 30)) * 100}%` }} onChange={(e) => setMax(+e.target.value)} />
          </div>
          <div className="fg">
            <h4>Ocena</h4>
            <div className="chips">
              {[[0, 'Każda'], [4.5, '4,5+'], [4.8, '4,8+']].map(([v, l]) => (
                <button key={l} className={`chip ${rating === v ? 'on' : ''}`} onClick={() => setRating(v as number)}>{v ? <Icon name="star" style="color:var(--warn)" /> : null}{l}</button>
              ))}
            </div>
          </div>
          <div className="fg">
            <label className="toggle">Tylko Velorie Studio<span className="sw"><input type="checkbox" checked={official} onChange={(e) => setOfficial(e.target.checked)} /><i /></span></label>
            <label className="toggle">Tylko ulubione ({wish.length})<span className="sw"><input type="checkbox" checked={onlyWish} onChange={(e) => setOnlyWish(e.target.checked)} /><i /></span></label>
          </div>
          <button className="btn btn-primary filter-btn" onClick={() => setSide(false)} style={{ width: '100%', marginTop: 8 }}>Pokaż wyniki ({list.length})</button>
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="toolbar">
            <button className="btn btn-ghost filter-btn" onClick={() => setSide(true)}><Icon name="filter" />Filtry</button>
            <label className="search-in"><Icon name="search" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj w katalogu…" aria-label="Szukaj w katalogu" /></label>
            <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sortowanie">
              <option value="pop">Najpopularniejsze</option>
              <option value="new">Ostatnio aktualizowane</option>
              <option value="rate">Najlepiej oceniane</option>
              <option value="asc">Cena: od najniższej</option>
              <option value="desc">Cena: od najwyższej</option>
            </select>
            <div className="seg">
              <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Widok siatki"><Icon name="grid" size={16} /></button>
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="Widok listy"><Icon name="list" size={16} /></button>
            </div>
          </div>
          <div className="active-f">
            <span className="res-count"><b>{list.length}</b> {plural(list.length, 'produkt', 'produkty', 'produktów')}</span>
            {chips.map(([k, l, rm]) => <button key={k} className="chip on" onClick={rm}>{l} <Icon name="x" size={12} /></button>)}
          </div>
          <div className="grid" style={view === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
            {list.length ? list.map((p) => <ProductCard key={p.slug} p={p} seller={sellers[p.seller]} list={view === 'list'} />) : (
              <div className="empty">
                <span className="ico"><Icon name="search" /></span>
                <b>Nic nie pasuje do tych filtrów</b>
                <span>Zmień kategorię, podnieś limit ceny albo wyczyść wyszukiwanie.</span>
                <button className="btn btn-ghost" onClick={reset}>Wyczyść filtry</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
