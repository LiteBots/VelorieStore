import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { publicStats } from '@/lib/stats';
import { num } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'O nas',
  description: 'Velorie Market to polski marketplace dla twórców i właścicieli serwerów Minecraft i FiveM.',
  alternates: { canonical: '/o-nas' },
};

export default async function AboutPage() {
  const s = await publicStats();
  return (
    <div className="view wrap">
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>O nas</span></nav>
        <h1>Budujemy miejsce, w którym <span className="grad">serwery rosną</span></h1>
        <p>Velorie zaczęło jako studio tworzące pluginy i skrypty dla dużych polskich serwerów. Dziś łączymy twórców z właścicielami serwerów — z licencjami, ochroną plików i wsparciem po zakupie.</p>
      </div>
      <div className="stats" style={{ marginBottom: 56 }}>
        <div className="stat"><b>{num(s.products)}</b><span>produktów</span></div>
        <div className="stat"><b>{num(s.licenses)}</b><span>aktywnych licencji</span></div>
        <div className="stat"><b>{num(s.sellers)}</b><span>twórców</span></div>
        <div className="stat"><b>{s.rating.toFixed(1).replace('.', ',')} / 5</b><span>średnia ocena</span></div>
      </div>
      <div className="check-list" style={{ paddingBottom: 40 }}>
        {[
          ['shield', 'Bezpieczeństwo', 'Każda wersja produktu przechodzi skan. Klucze licencji hashujemy, odpowiedzi API podpisujemy.'],
          ['bolt', 'Natychmiastowa dostawa', 'Klucz i pliki dostajesz sekundę po płatności. Bez czekania na ticket.'],
          ['users', 'Fair dla twórców', '85% ceny trafia do autora, a wypłaty wysyłamy co tydzień.'],
        ].map(([ic, t, d]) => <div key={t}><Icon name={ic} /><span><b>{t}</b><small>{d}</small></span></div>)}
      </div>
    </div>
  );
}
