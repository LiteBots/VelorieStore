import Link from 'next/link';
import { CATS, FAQ, num } from '@/lib/catalog';
import { loadProducts, loadSellers } from '@/lib/products';
import { publicStats, testimonials } from '@/lib/stats';
import { SITE } from '@/lib/site';
import { Icon } from '@/components/Icon';
import { ProductArt } from '@/components/ProductArt';
import { HeroArt } from '@/components/home/HeroArt';
import { HomeProducts } from '@/components/home/HomeProducts';
import { EarningsCalc } from '@/components/home/EarningsCalc';
import { LoginButton } from '@/components/LoginButton';
import { JsonLd } from '@/components/JsonLd';

export const dynamic = 'force-dynamic';

const TECH = ['Paper', 'Purpur', 'Folia', 'Velocity', 'Spigot', 'BungeeCord', 'ESX', 'QBCore', 'QBox', 'ox_lib', 'txAdmin', 'Cfx.re Escrow', 'Pterodactyl', 'Node.js'];
const fmtRating = (r: number) => r.toFixed(1).replace('.', ',');

export default async function Home() {
  const [products, sellers, stats, quotes] = await Promise.all([loadProducts(), loadSellers(), publicStats(), testimonials()]);
  const newest = [...products].sort((a, b) => b.updated.localeCompare(a.updated))[0];
  const mdt = products.find((p) => p.slug === 'velomdt') || products[0];
  const hud = products.find((p) => p.slug === 'nordichud') || products[1];
  const sMc = CATS.filter((c) => c.plat === 'minecraft'), sFm = CATS.filter((c) => c.plat === 'fivem');
  const count = (catId: string) => products.filter((p) => p.cat === catId).length;
  const spark = [12, 18, 15, 22, 19, 27, 25, 31, 29, 36, 34, 42];
  const sp = spark.map((v, i) => `${i ? 'L' : 'M'}${((i / (spark.length - 1)) * 280).toFixed(1)},${(70 - (v / 42) * 60).toFixed(1)}`).join('');
  const qrow = (list: typeof quotes, k: string) =>
    list.map((q, i) => (
      <figure className="q" style={{ margin: 0 }} key={k + i}>
        <span className="stars">★★★★★</span>
        <p>{q[0]}</p>
        <footer><span className="av" style={{ background: q[3] }}>{q[1][0]}</span><div><b>{q[1]}</b><small>{q[2]}</small></div></footer>
      </figure>
    ));

  return (
    <div className="view">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />

      {/* ============ HERO (bez zmian względem oryginału) ============ */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              {newest && (
                <Link href={`/produkt/${newest.slug}`} className="hero-badge reveal-1">
                  <i><Icon name="sparkle" />Nowość</i>{newest.name} już w sklepie <Icon name="right" />
                </Link>
              )}
              <h1 className="reveal-2">Buduj serwery,<br /><span className="grad">bez kompromisów.</span></h1>
              <p className="lead reveal-3">
                Pluginy na licencji, skrypty FiveM, mapy, interiory MLO i gotowe setupy od <b>Velorie Studio</b> i zweryfikowanych twórców. Kupujesz w minutę, wdrażasz w pięć.
              </p>
              <div className="hero-cta reveal-3">
                <Link href="/sklep" className="btn btn-primary btn-lg">Przeglądaj sklep <Icon name="arrow" /></Link>
                <Link href="/sprzedawaj" className="btn btn-ghost btn-lg">Sprzedawaj swoje projekty</Link>
              </div>
              <div className="trust reveal-3">
                <div className="trust-av">
                  {['K', 'M', 'O', 'B', 'Z'].map((l, i) => <span key={l} className="av" style={{ background: ['#2f6bff', '#0ea5e9', '#6366f1', '#38bdf8', '#1d4fd8'][i] }}>{l}</span>)}
                </div>
                <div className="trust-txt"><span className="st">★★★★★</span> <b>{fmtRating(stats.rating)} / 5</b><br />z {num(stats.reviews)} opinii właścicieli serwerów</div>
              </div>
            </div>
            <HeroArt />
          </div>
        </div>
      </section>

      <div className="marquee" aria-label="Wspierane platformy">
        <div className="marquee-label">Działa z platformami, na których stoi Twój serwer</div>
        <div className="marquee-track">
          {[...TECH, ...TECH].map((t, i) => <span className="mq" key={t + i}><i>{t.slice(0, 2)}</i>{t}</span>)}
        </div>
      </div>

      {/* ============ KATEGORIE ============ */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div><span className="eyebrow">Kategorie</span><h2>Wszystko dla Twojego serwera</h2><p>Od pojedynczego pluginu po kompletny serwer roleplay. Wybierz platformę i znajdź to, czego brakuje.</p></div>
            <Link href="/sklep" className="btn btn-ghost">Cały katalog <Icon name="arrow" /></Link>
          </div>
          <div className="bento-cats">
            {[
              { plat: 'minecraft', tile: 'mcTile', title: 'Minecraft', text: 'Pluginy Paper i Folia, mapy, lobby, resource packi i gotowe serwery od 1.8 do 1.21.', cats: sMc },
              { plat: 'fivem', tile: 'fivemTile', title: 'FiveM', text: 'Skrypty ESX, QBCore i QBox, interiory MLO, mapy YMAP i pojazdy add-on z podanym resmonem.', cats: sFm },
            ].map((b) => (
              <div className="bc bc-big spot" key={b.plat}>
                <Link href={`/sklep?plat=${b.plat}`} className="bc-art" aria-label={`Sklep ${b.title}`}><ProductArt p={{ id: b.tile, art: b.tile, plat: b.plat }} w={900} h={900} /></Link>
                <div className="bc-plat"><span className="pill blue">{b.title}</span><span className="pill">{num(b.cats.reduce((a, c) => a + count(c.id), 0))} produktów</span></div>
                <div className="bc-body">
                  <h3>{b.title}</h3>
                  <p className="muted" style={{ maxWidth: '40ch' }}>{b.text}</p>
                  <div className="bc-links">
                    {b.cats.map((c) => <Link key={c.id} href={`/kategoria/${c.id}`}>{c.name}<span>{num(count(c.id))}</span></Link>)}
                  </div>
                </div>
              </div>
            ))}
            {CATS.filter((c) => c.plat === 'other').map((c) => (
              <Link key={c.id} href={`/kategoria/${c.id}`} className="bc bc-sm spot">
                <span className="ico"><Icon name={c.icon} /></span><span className="arrow"><Icon name="arrow" /></span><h3>{c.full}</h3><p>{c.sub}</p>
              </Link>
            ))}
            <Link href="/sprzedawaj" className="bc bc-sm spot">
              <span className="ico"><Icon name="upload" /></span><span className="arrow"><Icon name="arrow" /></span><h3>Twoje projekty</h3><p>Masz plugin lub mapę? Wystaw ją i zarabiaj.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap"><HomeProducts products={products} sellers={sellers} /></div>
      </section>

      {/* ============ JAK TO DZIAŁA ============ */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head center"><span className="eyebrow">Jak to działa</span><h2>Od wyszukania do działającego serwera</h2><p>Bez ticketów, bez czekania na klucz i bez wysyłania plików na Discordzie.</p></div>
          <div className="how">
            <div className="how-card spot">
              <span className="n">01</span><h3>Znajdź rozwiązanie</h3><p>Filtruj po platformie, frameworku i wersji. Każdy produkt ma podane wymagania i wydajność.</p>
              <div className="mock">
                <div className="mock-search"><Icon name="search" /><span>mdt qbox</span><span className="caret" /></div>
                {mdt && <div className="mock-res"><ProductArt p={mdt} w={200} h={125} /><b>{mdt.name}</b><span className="mono" style={{ color: 'var(--ok)', fontSize: 11 }}>{mdt.resmon || '0.00 ms'}</span></div>}
                {hud && <div className="mock-res" style={{ opacity: 0.6 }}><ProductArt p={hud} w={200} h={125} /><b>{hud.name}</b><span className="mono" style={{ color: 'var(--ok)', fontSize: 11 }}>{hud.resmon || '0.02 ms'}</span></div>}
              </div>
            </div>
            <div className="how-card spot">
              <span className="n">02</span><h3>Zapłać jak wolisz</h3><p>BLIK, Przelewy24 albo karta. Klucz dostajesz w sekundę po zaksięgowaniu płatności.</p>
              <div className="mock" style={{ alignItems: 'center' }}>
                <span className="mono muted" style={{ fontSize: 11, letterSpacing: '.14em' }}>KOD BLIK</span>
                <div className="blik">{['4', '8', '2', '9', '1', '3'].map((d, i) => <span key={i} className={i === 5 ? 'on' : ''}>{d}</span>)}</div>
                <span className="pill ok" style={{ marginTop: 4 }}><Icon name="check" size={12} /> Płatność potwierdzona</span>
              </div>
            </div>
            <div className="how-card spot">
              <span className="n">03</span><h3>Wklej klucz i graj</h3><p>Licencja przypisuje się do serwera przy pierwszym starcie. Zmienisz serwer sam w bibliotece.</p>
              <div className="mock">
                <div className="term">
                  <span className="t-b">set</span> velorie_key <span className="t-c">&quot;VLR-7Q2M-…&quot;</span>{'\n'}
                  <span className="t-b">ensure</span> velorie_mdt{'\n'}
                  <span className="t-ok">✓</span> licencja Pro · serwer 2/3{'\n'}
                  <span className="t-ok">✓</span> v2.4.0 · najnowsza wersja
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DLA TWÓRCÓW ============ */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cb">
            <div className="cb-main spot">
              <span className="eyebrow">Dla developerów</span>
              <h2>Sprzedawaj swoje pluginy, skrypty i mapy</h2>
              <p>Ty tworzysz. My zajmujemy się płatnościami, licencjami, ochroną plików i obsługą klientów.</p>
              <ul className="cb-list">
                <li><Icon name="check" /><span><b>85% ceny dla Ciebie.</b> Prowizja 15%, bez opłat za wystawienie produktu.</span></li>
                <li><Icon name="check" /><span><b>Licencje i ochrona w cenie.</b> Klucze, limity serwerów i podpisane odpowiedzi API.</span></li>
                <li><Icon name="check" /><span><b>Wypłaty w każdy poniedziałek.</b> Przelew lub PayPal, od 50 zł.</span></li>
              </ul>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'auto' }}>
                <Link href="/sprzedawaj" className="btn btn-primary btn-lg">Zostań twórcą <Icon name="arrow" /></Link>
                <Link href="/panel/tworca" className="btn btn-ghost btn-lg">Zobacz panel</Link>
              </div>
            </div>
            <div className="cb-calc spot"><EarningsCalc /></div>
            <div className="cb-half spot">
              <h3>Wypłaty co tydzień</h3><p className="sub">Historia przelewów w panelu twórcy.</p>
              <div className="payout">
                <div><span className="ok"><Icon name="check" /></span>12.10.2026<b>3 912 zł</b></div>
                <div><span className="ok"><Icon name="check" /></span>05.10.2026<b>3 404 zł</b></div>
                <div style={{ opacity: 0.6 }}><span className="ok"><Icon name="check" /></span>28.09.2026<b>2 981 zł</b></div>
              </div>
            </div>
            <div className="cb-half spot">
              <h3>Klucze nie do podrobienia</h3><p className="sub">Klucze hashujemy (HMAC-SHA256), odpowiedzi API są podpisane.</p>
              <div className="fp">sha256:9f2c…a71e<br />buyer: <b>usr_48211</b><br />license: <b>VLR-7Q2M-K9XD-44PA</b><br />signature: <b>hmac-sha256 ✓</b></div>
            </div>
            <div className="cb-half spot spark">
              <h3>Statystyki na żywo</h3><p className="sub">Sprzedaż z ostatnich 12 tygodni.</p>
              <svg viewBox="-4 -4 288 84" role="img" aria-label="Przykładowy wykres sprzedaży rosnącej z 12 do 42 sztuk tygodniowo">
                <defs><linearGradient id="spg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2f6bff" stopOpacity=".45" /><stop offset="1" stopColor="#2f6bff" stopOpacity="0" /></linearGradient></defs>
                <path d={`${sp}L280,72L0,72Z`} fill="url(#spg)" />
                <path d={sp} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="280" cy={(70 - 60).toFixed(1)} r="4.5" fill="#8fdcff" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 'clamp(64px,8vw,112px)' }}>
        <div className="wrap">
          <div className="stats">
            <div className="stat"><b>{num(stats.products)}</b><span>produktów</span></div>
            <div className="stat"><b>{num(stats.licenses)}</b><span>aktywnych licencji</span></div>
            <div className="stat"><b>{num(stats.sellers)}</b><span>zweryfikowanych twórców</span></div>
            <div className="stat"><b>{fmtRating(stats.rating)} / 5</b><span>średnia ocena</span></div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap"><div className="sec-head center"><span className="eyebrow">Opinie</span><h2>Serwery, które nam ufają</h2></div></div>
        <div className="tm">
          <div className="tm-row">{qrow(quotes, 'a')}{qrow(quotes, 'b')}</div>
          <div className="tm-row rev">{qrow([...quotes].reverse(), 'c')}{qrow([...quotes].reverse(), 'd')}</div>
        </div>
      </section>

      <section className="sec" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="faq-wrap">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2 style={{ fontSize: 'clamp(30px,4vw,48px)', marginTop: 14 }}>Masz pytania?</h2>
              <p className="muted" style={{ marginTop: 14, fontSize: 16 }}>Najczęstsze pytania o licencje, płatności i sprzedaż. Resztę wyjaśnimy na Discordzie.</p>
              <div className="help-card">
                <b style={{ fontSize: 16 }}>Potrzebujesz pomocy?</b>
                <span className="muted" style={{ fontSize: 14 }}>Napisz ticket w panelu albo dołącz do Discorda.</span>
                <a href={SITE.discordInvite} target="_blank" rel="noopener noreferrer" className="btn btn-discord" style={{ width: 'fit-content' }}><Icon name="discord" />Dołącz do Discorda</a>
              </div>
            </div>
            <div className="faq">
              {FAQ.map((f, i) => (
                <details key={i} open={i === 0}><summary>{f[0]}<i><Icon name="plus" /></i></summary><p>{f[1]}</p></details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta">
            <span className="eyebrow">Zacznij dziś</span>
            <h2>Postaw serwer, o którym będą mówić gracze</h2>
            <p>Gotowe rozwiązania, natychmiastowa dostawa kluczy i 14 dni gwarancji działania na każdy zakup.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/sklep" className="btn btn-primary btn-lg">Przejdź do sklepu <Icon name="arrow" /></Link>
              <LoginButton className="btn btn-ghost btn-lg" hideWhenLogged />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
