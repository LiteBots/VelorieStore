'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATS, num, zl } from '@/lib/catalog';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { useStore } from './Store';

interface Lite { slug: string; name: string; price: number; cat: string; plat: string; art: string; imageUrl: string | null; desc: string; tech: string[] }
type Item = { g: string; href: string; node: React.ReactNode };

const PAGES: [string, string, string][] = [
  ['Sprzedawaj na Velorie', '/sprzedawaj', 'upload'],
  ['Panel twórcy', '/panel/tworca', 'chart'],
  ['Sprawdź licencję', '/licencje', 'key'],
  ['Moje zakupy', '/panel/zakupy', 'box'],
  ['Kontakt', '/kontakt', 'mail'],
  ['FAQ', '/faq', 'chat'],
  ['Regulamin', '/regulamin', 'receipt'],
];

/** Wyszukiwarka Ctrl+K / "/" + efekt podświetlenia krawędzi kart (.spot). */
export function CommandPalette() {
  const router = useRouter();
  const { palOpen, setPalOpen } = useStore();
  const [list, setList] = useState<Lite[] | null>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalOpen(!palOpen); }
      else if (e.key === '/' && !typing && !palOpen) { e.preventDefault(); setPalOpen(true); }
    };
    const spot = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('.spot') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointermove', spot, { passive: true });
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointermove', spot); };
  }, [palOpen, setPalOpen]);

  useEffect(() => {
    if (!palOpen) return;
    setQ(''); setSel(0);
    setTimeout(() => input.current?.focus(), 20);
    if (!list) fetch('/api/products').then((r) => r.json()).then(setList).catch(() => setList([]));
  }, [palOpen, list]);

  const items: Item[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    const prods = (list || [])
      .filter((p) => !s || [p.name, p.desc, ...(p.tech || []), CATS.find((c) => c.id === p.cat)?.full].join(' ').toLowerCase().includes(s))
      .slice(0, s ? 8 : 5)
      .map<Item>((p) => ({
        g: 'Produkty', href: `/produkt/${p.slug}`,
        node: (<><ProductArt p={{ id: p.slug, art: p.art, plat: p.plat, imageUrl: p.imageUrl }} w={200} h={125} /><b>{p.name}</b><small>{zl(p.price)}</small></>),
      }));
    const cats = CATS.filter((c) => !s || c.full.toLowerCase().includes(s) || c.sub.toLowerCase().includes(s))
      .slice(0, s ? 4 : 3)
      .map<Item>((c) => ({ g: 'Kategorie', href: `/kategoria/${c.id}`, node: (<><span className="pi"><Icon name={c.icon} /></span><b>{c.full}</b><small>{num(c.count)}</small></>) }));
    const pages = PAGES.filter((x) => !s || x[0].toLowerCase().includes(s))
      .map<Item>((x) => ({ g: 'Strony', href: x[1], node: (<><span className="pi"><Icon name={x[2]} /></span><b>{x[0]}</b></>) }));
    return [...prods, ...cats, ...pages];
  }, [q, list]);

  const go = (i: number) => {
    const it = items[i];
    if (!it) return;
    setPalOpen(false);
    router.push(it.href);
  };

  let last = '';
  return (
    <div className={`pal ${palOpen ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label="Wyszukiwarka" onClick={(e) => { if (e.target === e.currentTarget) setPalOpen(false); }}>
      <div className="pal-box">
        <div className="pal-in">
          <Icon name="search" />
          <input
            ref={input}
            value={q}
            placeholder="Szukaj produktów, kategorii, stron…"
            autoComplete="off"
            aria-label="Szukaj"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
              else if (e.key === 'Escape') setPalOpen(false);
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="pal-list">
          {list === null && palOpen ? <div className="empty" style={{ border: 0 }}>Ładowanie…</div> : null}
          {items.length ? items.map((it, i) => {
            const head = it.g !== last ? <div className="pal-g">{it.g}</div> : null;
            last = it.g;
            return (
              <div key={it.href + i}>
                {head}
                <button className={`pal-i ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>{it.node}</button>
              </div>
            );
          }) : list !== null ? <div className="empty" style={{ border: 0 }}>Brak wyników dla „{q}”.</div> : null}
        </div>
        <div className="pal-f"><span><span className="kbd">↑</span> <span className="kbd">↓</span> wybór</span><span><span className="kbd">Enter</span> otwórz</span></div>
      </div>
    </div>
  );
}
