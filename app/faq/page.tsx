import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { JsonLd } from '@/components/JsonLd';
import { FAQ } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'FAQ — najczęstsze pytania',
  description: 'Jak działa licencja, czym jest escrow, jak sprzedawać na Velorie, metody płatności, zwroty i aktualizacje.',
  alternates: { canonical: '/faq' },
};

const MORE: [string, string][] = [
  ['Czy mogę przenieść licencję na inny serwer?', 'Tak. W bibliotece zakupów odpinasz serwer (3 razy w miesiącu), a przy następnym uruchomieniu nowy serwer przypisze się automatycznie.'],
  ['Czy dostanę fakturę?', 'Tak. Po zakupie napisz ticket z danymi do faktury, wystawimy ją w ciągu 2 dni roboczych.'],
  ['Czy mogę podnieść licencję ze Standard na Pro?', 'Tak, płacisz tylko różnicę w cenie. Napisz ticket z numerem zamówienia.'],
  ['Jak chronicie moje dane?', 'Logujemy wyłącznie przez Discord (nie przechowujemy haseł), klucze licencji przechowujemy zahashowane i zaszyfrowane, adresy IP tylko w postaci skrótów. Szczegóły w polityce prywatności.'],
];

export default function FaqPage() {
  const all = [...FAQ, ...MORE];
  return (
    <div className="view wrap">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: all.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <div className="ph">
        <nav className="crumbs"><Link href="/">Start</Link><Icon name="right" /><span>FAQ</span></nav>
        <h1>Najczęstsze pytania</h1>
        <p>Nie ma tu odpowiedzi? <Link href="/kontakt" style={{ color: 'var(--cyan)' }}>Napisz do nas</Link>.</p>
      </div>
      <div className="faq" style={{ maxWidth: 860, paddingBottom: 40 }}>
        {all.map(([q, a], i) => <details key={i} open={i === 0}><summary>{q}<i><Icon name="plus" /></i></summary><p>{a}</p></details>)}
      </div>
    </div>
  );
}
