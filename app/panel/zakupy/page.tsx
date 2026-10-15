import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Product } from '@/models';
import { decrypt } from '@/lib/crypto';
import { catOf, licOf } from '@/lib/catalog';
import { unbindServer } from '@/lib/actions/panel';
import { Icon } from '@/components/Icon';
import { ProductArt } from '@/components/ProductArt';
import { KeyBox } from '@/components/panel/KeyBox';
import { StatusPill } from '@/components/panel/Status';

export default async function Purchases({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const user = await requireUser('/panel/zakupy');
  await db();
  const lics = await License.find({ userId: user.id }).sort({ createdAt: -1 }).lean<any[]>();
  const prods = await Product.find({ slug: { $in: lics.map((l) => l.productSlug) } }).lean<any[]>();
  const bySlug = new Map<string, any>(prods.map((p) => [p.slug, p]));
  const month = new Date().toISOString().slice(0, 7);
  return (
    <>
      <div className="panel-top"><div><span className="eyebrow">Biblioteka</span><h1>Moje zakupy</h1></div></div>
      <p className="muted" style={{ marginBottom: 16, maxWidth: '70ch' }}>
        Klucz wpisujesz w configu produktu. Serwer przypisuje się automatycznie przy pierwszym uruchomieniu. Możesz odpiąć serwer 3 razy w miesiącu.
      </p>
      {err === 'limit' && <div className="alert err" style={{ marginBottom: 12 }}>Wykorzystałeś limit 3 odpięć w tym miesiącu. Napisz ticket, jeśli potrzebujesz pomocy.</div>}
      <div className="stack">
        {lics.length ? lics.map((l) => {
          const p = bySlug.get(l.productSlug);
          const tier = licOf(l.tier);
          let key = '';
          try { key = decrypt(l.keyEnc); } catch { key = `VLR-••••-••••-${l.keyLast4}`; }
          const left = l.unbindsMonth === month ? Math.max(0, 3 - l.unbindsThisMonth) : 3;
          return (
            <div className="lib-item" key={String(l._id)}>
              {p ? <ProductArt p={{ id: p.slug, art: p.art, plat: catOf(p.cat).plat, imageUrl: p.imageUrl }} w={320} h={200} /> : <div className="art-ph" />}
              <div style={{ minWidth: 0 }}>
                <div className="row">
                  {p ? <Link href={`/produkt/${p.slug}`} style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</Link> : <b>{l.productSlug}</b>}
                  <span className="pill">{tier.name}</span>
                  {p && <span className="pill ok">v{p.version}</span>}
                  <StatusPill s={l.status} />
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Kupione {new Date(l.createdAt).toLocaleDateString('pl-PL')} · aktualizacje {l.updatesUntil ? `do ${new Date(l.updatesUntil).toLocaleDateString('pl-PL')}` : 'dożywotnio'}
                </div>
                <KeyBox value={key} masked />
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="muted" style={{ fontSize: 12.5 }}>Serwery {l.servers.length}/{tier.maxServers >= 999 ? '∞' : tier.maxServers}:</span>
                  {l.servers.length ? l.servers.map((s: any) => (
                    <form key={s.id} action={unbindServer} className="server-pill">
                      <input type="hidden" name="license" value={String(l._id)} />
                      <input type="hidden" name="server" value={s.id} />
                      {s.label || 'serwer'}
                      <button type="submit" disabled={!left || l.status !== 'active'} title={`Odepnij (pozostało ${left} w tym miesiącu)`}>✕</button>
                    </form>
                  )) : <span className="muted" style={{ fontSize: 12.5 }}>brak — przypisze się przy pierwszym starcie</span>}
                </div>
              </div>
              <div className="stack" style={{ minWidth: 190 }}>
                {l.status === 'active' ? (
                  <a className="btn btn-ghost btn-sm" href={`/api/download/${l._id}`}><Icon name="download" />Pobierz pliki</a>
                ) : <span className="muted" style={{ fontSize: 12.5 }}>Licencja nieaktywna</span>}
                <Link className="btn btn-ghost btn-sm" href={`/panel/tickety?produkt=${l.productSlug}`}><Icon name="ticket" />Zgłoś problem</Link>
              </div>
            </div>
          );
        }) : (
          <div className="empty">
            <span className="ico"><Icon name="box" /></span>
            <b>Nie masz jeszcze zakupów</b>
            <span>Kupione produkty pojawią się tutaj razem z kluczami licencji.</span>
            <Link href="/sklep" className="btn btn-primary">Przejdź do sklepu</Link>
          </div>
        )}
      </div>
    </>
  );
}
