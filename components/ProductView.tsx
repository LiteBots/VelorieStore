'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LIC, PLATS, catOf, licOf, num, plural, priceFor, zl, type LicId } from '@/lib/catalog';
import type { ProductDTO, SellerDTO } from '@/lib/types';
import { cfgFor, compatRows } from '@/lib/product-extras';
import { reviewAction } from '@/lib/actions/public';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { Badge, ProductCard, SellerAv } from './ProductCard';
import { ActionForm, Submit } from './Forms';
import { useStore } from './Store';

export interface ReviewDTO { id: string; user: string; rating: number; text: string; date: string }

const FEAT_ICO = ['bolt', 'shield', 'refresh', 'chart', 'cog', 'sparkle'];
const COLORS = ['#2f6bff', '#0ea5e9', '#6366f1', '#38bdf8', '#1d4fd8'];

function CodeBlock({ file, html }: { file: string; html: string }) {
  const { toast } = useStore();
  return (
    <div className="code">
      <div className="code-h">
        <span>{file}</span>
        <button onClick={(e) => {
          const pre = (e.currentTarget.closest('.code') as HTMLElement).querySelector('pre') as HTMLElement;
          navigator.clipboard?.writeText(pre.innerText).then(() => toast('Skopiowano'), () => toast('Nie udało się skopiować', true));
        }}>Kopiuj</button>
      </div>
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function ProductView({ p, seller, related, sellers, reviews, canReview }: {
  p: ProductDTO; seller?: SellerDTO; related: ProductDTO[]; sellers: Record<string, SellerDTO>; reviews: ReviewDTO[]; canReview: boolean;
}) {
  const { add, wish, toggleWish, setCartOpen } = useStore();
  const [img, setImg] = useState(0);
  const [tab, setTab] = useState<'opis' | 'kompat' | 'changelog' | 'opinie'>('opis');
  const [lic, setLic] = useState<LicId>('std');
  const c = catOf(p.cat);
  const lp = priceFor(p.price, lic);
  const liked = wish.includes(p.slug);
  const [f1, c1, f2, c2] = cfgFor(p);
  const dist = [0.78, 0.15, 0.04, 0.02, 0.01].map((v, i) => (i === 0 ? v - (5 - p.rating) * 0.6 : v + (5 - p.rating) * 0.15));

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement)?.tagName || '')) return;
      if (e.key === 'ArrowRight') setImg((i) => (i + 1) % 4);
      if (e.key === 'ArrowLeft') setImg((i) => (i + 3) % 4);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const addToCart = () => add({ slug: p.slug, lic, name: p.name, price: p.price, art: p.art, plat: p.plat, imageUrl: p.imageUrl });
  const buyNow = () => { addToCart(); setCartOpen(true); };

  return (
    <div className="view wrap">
      <nav className="crumbs" style={{ paddingTop: 28 }} aria-label="Okruszki">
        <Link href="/">Start</Link><Icon name="right" />
        <Link href={`/sklep?plat=${p.plat}`}>{PLATS[p.plat]}</Link><Icon name="right" />
        <Link href={`/kategoria/${c.id}`}>{c.full}</Link><Icon name="right" />
        <span style={{ color: 'var(--fg-2)' }}>{p.name}</span>
      </nav>
      <div className="pd">
        <div style={{ minWidth: 0 }}>
          <div className="gal-main">
            <ProductArt key={img} p={p} v={img} w={1200} h={750} alt={`Podgląd: ${p.name}`} />
            <button className="gal-nav l" onClick={() => setImg((img + 3) % 4)} aria-label="Poprzednie zdjęcie"><Icon name="left" /></button>
            <button className="gal-nav r" onClick={() => setImg((img + 1) % 4)} aria-label="Następne zdjęcie"><Icon name="right" /></button>
            <span className="gal-count">{img + 1} / 4</span>
          </div>
          <div className="gal-thumbs">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Zdjęcie ${i + 1}`}>
                <ProductArt p={p} v={i} w={320} h={200} />
              </button>
            ))}
          </div>

          <div className="ptabs" role="tablist">
            {([['opis', 'Opis'], ['kompat', 'Kompatybilność'], ['changelog', 'Changelog'], ['opinie', 'Opinie', p.reviews]] as [typeof tab, string, number?][]).map(([v, l, n]) => (
              <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>
                {l}{n ? <small>{num(n)}</small> : null}
              </button>
            ))}
          </div>

          <div className="pane">
            {tab === 'opis' && (
              <>
                <p className="lead">{p.desc} Produkt przeszedł skan bezpieczeństwa Velorie i jest objęty 14-dniową gwarancją działania.</p>
                {p.longDesc && p.longDesc.split(/\n{2,}/).map((para, i) => <p key={i} style={{ color: 'var(--fg-2)', maxWidth: '68ch', whiteSpace: 'pre-line' }}>{para}</p>)}
                <h3>Co zawiera</h3>
                <div className="feat-grid">
                  {p.feats.map((f, i) => <div className="feat" key={i}><span className="fi-ico"><Icon name={FEAT_ICO[i % 6]} /></span><b>{f}</b></div>)}
                </div>
                <h3>Konfiguracja</h3>
                <CodeBlock file={f1} html={c1} />
                {f2 && c2 && <CodeBlock file={f2} html={c2} />}
              </>
            )}
            {tab === 'kompat' && (
              <>
                <p className="lead">Zgodność sprawdzona przez twórcę dla wersji {p.version}.</p>
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Platforma</th><th>Status</th><th>Uwagi</th></tr></thead>
                    <tbody>
                      {compatRows(p).map(([n, ok]) => (
                        <tr key={n}><td>{n}</td><td className={ok ? 'yes' : 'no'}>{ok ? '✓ wspierane' : '— brak'}</td><td className="muted">{ok ? `testowane w ${p.updated.slice(0, 7)}` : 'nie planowane'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === 'changelog' && (
              <div className="timeline">
                {(p.changelog.length ? p.changelog : [{ version: p.version, date: p.updated, notes: ['Pierwsze wydanie na Velorie Market'] }]).map((e, i) => (
                  <div className="tl" key={e.version + i}>
                    <div className="tl-h"><b>v{e.version}</b>{i === 0 && <span className="pill cyan">najnowsza</span>}<span className="mono muted" style={{ fontSize: 12 }}>{e.date}</span></div>
                    <ul>{e.notes.map((n, j) => <li key={j}>{n}</li>)}</ul>
                  </div>
                ))}
              </div>
            )}
            {tab === 'opinie' && (
              <>
                <div className="rv-sum">
                  <div>
                    <span className="big-num">{p.rating.toFixed(1).replace('.', ',')}</span>
                    <div style={{ color: 'var(--warn)', letterSpacing: 2, marginTop: 6 }}>★★★★★</div>
                    <span className="muted" style={{ fontSize: 13 }}>{num(p.reviews)} {plural(p.reviews, 'opinia', 'opinie', 'opinii')}</span>
                  </div>
                  <div className="rv-bars">
                    {dist.map((v, i) => (
                      <div className="rv-bar" key={i}><span>{5 - i}★</span><i><span style={{ width: `${Math.max(1, v * 100).toFixed(0)}%` }} /></i><span>{Math.max(0, Math.round(v * 100))}%</span></div>
                    ))}
                  </div>
                </div>
                {canReview && (
                  <ActionForm action={reviewAction} className="panel stack">
                    <b>Twoja opinia</b>
                    <input type="hidden" name="slug" value={p.slug} />
                    <div className="row">
                      <label className="muted" htmlFor="rv-rating" style={{ fontSize: 13 }}>Ocena</label>
                      <select id="rv-rating" name="rating" className="sel" defaultValue="5" style={{ height: 40 }}>
                        {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5 - r)}</option>)}
                      </select>
                    </div>
                    <div className="field"><textarea name="text" required minLength={10} maxLength={1200} placeholder="Jak sprawdza się na Twoim serwerze?" /></div>
                    <Submit style={{ width: 'fit-content' }}>Dodaj opinię</Submit>
                  </ActionForm>
                )}
                {reviews.length === 0 && <p className="muted">Ten produkt nie ma jeszcze opinii od kupujących na Velorie. Opinię może dodać każdy właściciel licencji.</p>}
                {reviews.map((r, i) => (
                  <div className="rv" key={r.id}>
                    <div className="rv-h">
                      <span className="av" style={{ background: COLORS[i % COLORS.length] }}>{r.user[0]}</span>
                      <div><b>{r.user}</b><span className="muted">{r.date} · zweryfikowany zakup</span></div>
                      <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p>{r.text}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <aside className="buy">
          <div className="buy-card">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="pill blue">{PLATS[p.plat]}</span><span className="pill">{p.type}</span><Badge b={p.badge} /></div>
            <h1>{p.name}</h1>
            <div className="buy-meta">
              <span className="rate"><Icon name="star" />{p.rating.toFixed(1)}</span>
              <span>{num(p.reviews)} {plural(p.reviews, 'opinia', 'opinie', 'opinii')}</span>
              <span>{num(p.sales)} sprzedanych</span>
            </div>
            <div className="lic" role="radiogroup" aria-label="Typ licencji">
              {LIC.map((l) => (
                <label key={l.id} className={lic === l.id ? 'on' : ''}>
                  <input type="radio" name="lic" value={l.id} checked={lic === l.id} onChange={() => setLic(l.id)} />
                  <span className="radio" />
                  <span><b>{l.name}{l.id === 'pro' && <span className="pill cyan" style={{ fontSize: 9.5, padding: '2px 6px' }}>najczęściej</span>}</b><small>{l.note}</small></span>
                  <span className="lp">{zl(priceFor(p.price, l.id))}</span>
                </label>
              ))}
            </div>
            <div className="buy-price"><b>{zl(lp)}</b>{p.old && lic === 'std' ? <s>{zl(p.old)}</s> : null}</div>
            <div className="buy-actions">
              <button className="btn btn-primary btn-lg" onClick={addToCart}><Icon name="cart" />Dodaj do koszyka</button>
              <button className="btn btn-ghost" onClick={buyNow}>Kup teraz</button>
              <button className="btn btn-ghost btn-icon" onClick={() => toggleWish(p.slug)} aria-label="Ulubione" aria-pressed={liked} style={liked ? { color: '#ff6b8b' } : undefined}><Icon name="heart" /></button>
            </div>
            <ul className="perks">
              <li><Icon name="check" />Klucz i pliki od razu po płatności</li>
              <li><Icon name="check" />Skan bezpieczeństwa: brak zagrożeń</li>
              <li><Icon name="check" />14 dni gwarancji działania</li>
              <li><Icon name="check" />Aktualizacje w bibliotece zakupów</li>
            </ul>
          </div>
          <dl className="specs">
            <div><dt>Wersja</dt><dd>v{p.version}</dd></div>
            <div><dt>Aktualizacja</dt><dd>{p.updated}</dd></div>
            <div><dt>{p.plat === 'fivem' ? 'Framework / build' : p.plat === 'minecraft' ? 'Wersje MC' : 'Środowisko'}</dt><dd>{p.compat}</dd></div>
            {p.resmon && <div><dt>Resmon (idle)</dt><dd style={{ color: 'var(--ok)' }}>{p.resmon}</dd></div>}
            <div><dt>Typ plików</dt><dd>{p.type}</dd></div>
          </dl>
          {seller && (
            <Link className="seller-card" href={`/tworca/${seller.slug}`}>
              <SellerAv s={seller} />
              <div><b>{seller.name}{seller.official && <Icon name="ver" />}</b><small>{seller.official ? 'Oficjalne studio' : 'Zweryfikowany twórca'} · {num(seller.sales)} sprzedaży</small></div>
              <Icon name="right" />
            </Link>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section style={{ paddingBlock: '24px 0' }}>
          <div className="sec-head"><div><span className="eyebrow">Podobne produkty</span><h2 style={{ fontSize: 'clamp(26px,3vw,36px)' }}>Może Cię zainteresować</h2></div></div>
          <div className="grid">{related.map((x) => <ProductCard key={x.slug} p={x} seller={sellers[x.seller]} />)}</div>
        </section>
      )}

      <div className="mbar">
        <div style={{ minWidth: 0 }}><div className="muted" style={{ fontSize: 11.5 }}>{licOf(lic).name}</div><b className="tnum" style={{ fontSize: 18 }}>{zl(lp)}</b></div>
        <button className="btn btn-primary" onClick={addToCart}><Icon name="cart" />Do koszyka</button>
      </div>
    </div>
  );
}
