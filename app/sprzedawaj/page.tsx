import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { EarningsCalc } from '@/components/home/EarningsCalc';
import { ApplyForm } from '@/components/PublicForms';

export const metadata: Metadata = {
  title: 'Sprzedawaj pluginy, skrypty i mapy — zostań twórcą',
  description: 'Sprzedawaj pluginy Minecraft, skrypty FiveM, mapy i MLO na Velorie Market. 85% ceny dla Ciebie, licencje i ochrona plików w cenie, wypłaty co tydzień.',
  alternates: { canonical: '/sprzedawaj' },
};

export default function SellPage() {
  return (
    <div className="view wrap">
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>Dla twórców</span></nav>
        <h1>Twój kod. Twoje mapy.<br /><span className="grad">Twój zarobek.</span></h1>
        <p>Velorie Market to miejsce, gdzie developerzy Minecraft i FiveM sprzedają swoje prace właścicielom serwerów. My bierzemy na siebie płatności, licencje, ochronę plików i obsługę zwrotów.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
          <a href="#zgloszenie" className="btn btn-primary btn-lg">Wyślij zgłoszenie <Icon name="arrow" /></a>
          <Link href="/panel/tworca" className="btn btn-ghost btn-lg">Zobacz panel twórcy</Link>
        </div>
      </div>
      <div className="steps4" style={{ marginBlock: '32px 64px' }}>
        {[
          ['Załóż konto', 'Logujesz się przez Discord i wysyłasz zgłoszenie z portfolio. Weryfikacja trwa do 48 godzin.'],
          ['Wystaw produkt', 'Przesyłasz pliki, opis, wymagania i cenę licencji Standard. Pro i Network liczą się automatycznie.'],
          ['Przejdź skan', 'Sprawdzamy kod i assety pod kątem malware, backdoorów i praw autorskich.'],
          ['Zarabiaj', 'Klienci kupują, Velorie wydaje klucze, a Ty dostajesz wypłatę w poniedziałek.'],
        ].map((x, i) => <div key={i}><span className="n">0{i + 1}</span><h3>{x[0]}</h3><p>{x[1]}</p></div>)}
      </div>
      <div className="cb" style={{ marginBottom: 64 }}>
        <div className="cb-calc spot" style={{ gridColumn: 'span 3' }}><EarningsCalc /></div>
        <div className="cb-calc spot" style={{ gridColumn: 'span 3' }}>
          <span className="eyebrow">Co sprawdzamy</span>
          <h3 style={{ fontSize: 22, marginTop: 12 }}>Skan każdej wersji</h3>
          <p className="sub" style={{ fontSize: 14.5, marginBottom: 16 }}>Klienci kupują bez obaw, więc chętniej wracają po kolejne produkty.</p>
          <div className="payout">
            {['Ukryte komendy OP i backdoory', 'Wysyłanie danych na zewnętrzne serwery', 'Zaciemniony kod bez escrow', 'Wydajność: resmon i TPS przy obciążeniu', 'Prawa do modeli i tekstur'].map((t) => (
              <div key={t}><span className="ok"><Icon name="check" /></span>{t}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="sec-head" id="zgloszenie">
        <div><span className="eyebrow">Zgłoszenie</span><h2 style={{ fontSize: 'clamp(26px,3vw,40px)' }}>Dołącz do twórców Velorie</h2><p>Po akceptacji dostaniesz dostęp do panelu twórcy, a my dodamy Twoje produkty do sklepu.</p></div>
      </div>
      <ApplyForm />
    </div>
  );
}
