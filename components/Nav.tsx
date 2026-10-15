'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { CATS, plural, zl } from '@/lib/catalog';
import type { ProductDTO } from '@/lib/types';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { useStore } from './Store';

export const Logo = ({ em = true }: { em?: boolean }) => (
  <>
    <img className="logo-img" src="/brand/logo-128.png" alt="" width={36} height={36} />
    Velorie{em && <em>MARKET</em>}
  </>
);

function CatItem({ id, onGo }: { id: string; onGo?: () => void }) {
  const c = CATS.find((x) => x.id === id)!;
  return (
    <Link className="mi" href={`/kategoria/${c.id}`} onClick={onGo}>
      <span className="mi-ico"><Icon name={c.icon} /></span>
      <span><b>{c.full}</b><small>{c.sub}</small></span>
    </Link>
  );
}

export function Nav({ featured }: { featured: ProductDTO | null }) {
  const path = usePathname();
  const { data } = useSession();
  const user = data?.user;
  const { cart, setCartOpen, setPalOpen, bump } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [mnav, setMnav] = useState(false);
  const [mac, setMac] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cartRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(null); setMnav(false); }, [path]);
  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform || '')); }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-menu]')) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setMnav(false); } };
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, []);
  useEffect(() => {
    if (bump && cartRef.current?.animate) cartRef.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 350 });
  }, [bump]);

  const hover = (id: string | null) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(timer.current);
    if (id) setOpen(id);
    else timer.current = setTimeout(() => setOpen(null), 180);
  };
  const menu = (id: string) => ({
    'data-menu': true,
    className: open === id ? 'open' : '',
    onPointerEnter: hover(id),
    onPointerLeave: hover(null),
  });
  const btn = (id: string, label: string, active: boolean) => (
    <button className={`menu-btn ${active ? 'active' : ''}`} aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
      {label} <Icon name="chev" />
    </button>
  );
  const is = (...p: string[]) => p.some((x) => path === x || path.startsWith(x + '/'));
  const cc = cart.length;
  const login = () => signIn('discord', { callbackUrl: path.startsWith('/logowanie') ? '/panel' : path });

  return (
    <>
      <header className="nav" id="nav">
        <div className="wrap">
          <Link href="/" className="logo" aria-label="Velorie Market, strona główna"><Logo /></Link>
          <button className="nav-search" onClick={() => setPalOpen(true)} aria-label="Szukaj produktów">
            <Icon name="search" /><span>Szukaj pluginów, skryptów, map…</span><span className="kbd">{mac ? '⌘ K' : 'Ctrl K'}</span>
          </button>
          <nav className="menu" aria-label="Główne menu">
            <div {...menu('sklep')}>
              {btn('sklep', 'Sklep', is('/sklep', '/kategoria', '/produkt'))}
              <div className="mega mega-shop">
                <div className="mega-head">Minecraft · FiveM · Discord i web</div>
                {CATS.filter((c) => c.plat !== 'other').map((c) => <CatItem key={c.id} id={c.id} />)}
                {CATS.filter((c) => c.plat === 'other').slice(0, 2).map((c) => <CatItem key={c.id} id={c.id} />)}
                {featured && (
                  <Link className="mega-feat" href={`/produkt/${featured.slug}`}>
                    <ProductArt p={featured} w={500} h={312} />
                    <div>
                      <span className="eyebrow">Wyróżnione</span>
                      <b style={{ fontSize: 15 }}>{featured.name}</b>
                      <span className="muted" style={{ fontSize: 12.5 }}>{featured.desc}</span>
                      <span className="price" style={{ fontSize: 16, marginTop: 4 }}>{zl(featured.price)}</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
            <div {...menu('tworcy')}>
              {btn('tworcy', 'Dla twórców', is('/sprzedawaj', '/tworca', '/panel/tworca'))}
              <div className="mega mega-sm">
                <Link className="mi" href="/sprzedawaj"><span className="mi-ico"><Icon name="upload" /></span><span><b>Sprzedawaj na Velorie</b><small>85% ceny dla Ciebie, wypłaty co tydzień</small></span></Link>
                <Link className="mi" href="/panel/tworca"><span className="mi-ico"><Icon name="chart" /></span><span><b>Panel twórcy</b><small>Sprzedaż, licencje, wypłaty</small></span></Link>
                <Link className="mi" href="/tworca/velorie"><span className="mi-ico"><Icon name="shield" /></span><span><b>Velorie Studio</b><small>Oficjalne produkty platformy</small></span></Link>
              </div>
            </div>
            <div {...menu('pomoc')}>
              {btn('pomoc', 'Pomoc', is('/licencje', '/faq', '/kontakt'))}
              <div className="mega mega-sm">
                <Link className="mi" href="/licencje"><span className="mi-ico"><Icon name="key" /></span><span><b>Licencje</b><small>Sprawdź klucz i porównaj typy</small></span></Link>
                <Link className="mi" href="/panel/zakupy"><span className="mi-ico"><Icon name="box" /></span><span><b>Moje zakupy</b><small>Klucze, pliki i aktualizacje</small></span></Link>
                <Link className="mi" href="/faq"><span className="mi-ico"><Icon name="chat" /></span><span><b>FAQ</b><small>Płatności, zwroty, escrow</small></span></Link>
                <Link className="mi" href="/kontakt"><span className="mi-ico"><Icon name="mail" /></span><span><b>Kontakt</b><small>Formularz i Discord</small></span></Link>
              </div>
            </div>
          </nav>
          <div className="nav-right">
            <button className="icon-btn nav-search-sm" onClick={() => setPalOpen(true)} aria-label="Szukaj"><Icon name="search" /></button>
            <button ref={cartRef} className="icon-btn" onClick={() => setCartOpen(true)} aria-label={`Koszyk, ${cc} ${plural(cc, 'produkt', 'produkty', 'produktów')}`}>
              <Icon name="cart" />{cc ? <span className="count">{cc}</span> : null}
            </button>
            {user ? (
              <div data-menu className={open === 'user' ? 'open' : ''} style={{ position: 'relative' }} onPointerEnter={hover('user')} onPointerLeave={hover(null)}>
                <button className="user-chip" onClick={() => setOpen(open === 'user' ? null : 'user')} aria-expanded={open === 'user'}>
                  {user.image ? <img className="av" src={user.image} alt="" width={32} height={32} /> : <span className="av" style={{ background: 'linear-gradient(135deg,#4a82ff,#38bdf8)' }}>{user.name?.[0]}</span>}
                  {user.name}
                </button>
                <div className="mega mega-sm" style={{ left: 'auto', right: 0, transform: open === 'user' ? 'none' : 'translate(0,6px)' }}>
                  <Link className="mi" href="/panel"><span className="mi-ico"><Icon name="user" /></span><span><b>Mój panel</b><small>Przegląd konta</small></span></Link>
                  <Link className="mi" href="/panel/zakupy"><span className="mi-ico"><Icon name="box" /></span><span><b>Moje zakupy</b><small>Licencje i pliki</small></span></Link>
                  {(user.role === 'creator' || user.role === 'admin') && (
                    <Link className="mi" href="/panel/tworca"><span className="mi-ico"><Icon name="chart" /></span><span><b>Panel twórcy</b><small>Statystyki i wypłaty</small></span></Link>
                  )}
                  {user.role === 'admin' && (
                    <Link className="mi" href="/admin"><span className="mi-ico"><Icon name="cog" /></span><span><b>Panel admina</b><small>Zarządzanie platformą</small></span></Link>
                  )}
                  <button className="mi" onClick={() => signOut({ callbackUrl: '/' })}><span className="mi-ico"><Icon name="logout" /></span><span><b>Wyloguj</b></span></button>
                </div>
              </div>
            ) : (
              <button className="btn btn-discord" onClick={login}><Icon name="discord" />Zaloguj przez Discord</button>
            )}
            <button className="icon-btn burger" onClick={() => setMnav(true)} aria-label="Otwórz menu"><Icon name="menu" /></button>
          </div>
        </div>
      </header>

      <div className={`mnav ${mnav ? 'on' : ''}`} aria-label="Menu" aria-hidden={!mnav}>
        <div className="mnav-h">
          <Link href="/" className="logo"><Logo em={false} /></Link>
          <button className="icon-btn" onClick={() => setMnav(false)} aria-label="Zamknij menu"><Icon name="x" /></button>
        </div>
        <button className="nav-search" onClick={() => { setMnav(false); setPalOpen(true); }} style={{ display: 'flex', flex: 'none', marginBottom: 10 }}>
          <Icon name="search" /><span>Szukaj…</span>
        </button>
        <div className="mega-head" style={{ padding: '10px 12px 4px' }}>SKLEP</div>
        {CATS.map((c) => <CatItem key={c.id} id={c.id} onGo={() => setMnav(false)} />)}
        <div className="mega-head" style={{ padding: '16px 12px 4px' }}>KONTO</div>
        <Link className="mi" href="/sprzedawaj"><span className="mi-ico"><Icon name="upload" /></span><span><b>Sprzedawaj</b></span></Link>
        <Link className="mi" href="/panel"><span className="mi-ico"><Icon name="user" /></span><span><b>Mój panel</b></span></Link>
        <Link className="mi" href="/panel/zakupy"><span className="mi-ico"><Icon name="box" /></span><span><b>Moje zakupy</b></span></Link>
        <Link className="mi" href="/licencje"><span className="mi-ico"><Icon name="key" /></span><span><b>Licencje</b></span></Link>
        <Link className="mi" href="/kontakt"><span className="mi-ico"><Icon name="mail" /></span><span><b>Kontakt</b></span></Link>
        {user?.role === 'admin' && <Link className="mi" href="/admin"><span className="mi-ico"><Icon name="cog" /></span><span><b>Panel admina</b></span></Link>}
        {user ? (
          <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: '/' })} style={{ marginTop: 12 }}><Icon name="logout" />Wyloguj ({user.name})</button>
        ) : (
          <button className="btn btn-discord btn-lg" onClick={login} style={{ marginTop: 12 }}><Icon name="discord" />Zaloguj przez Discord</button>
        )}
      </div>
    </>
  );
}
