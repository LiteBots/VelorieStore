import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Zwroty i gwarancja', description: 'Zasady zwrotów i 14-dniowej gwarancji działania w Velorie Market.', alternates: { canonical: '/zwroty' } };

export default function Refunds() {
  return (
    <LegalPage title="Zwroty i gwarancja" toc={[['gwarancja', 'Gwarancja działania'], ['jak', 'Jak zgłosić'], ['kiedy', 'Kiedy zwracamy'], ['czas', 'Czas zwrotu']]}>
      <h2 id="gwarancja">14 dni gwarancji działania</h2>
      <p>Każdy zakup jest objęty 14-dniową gwarancją działania. Jeśli produkt nie działa zgodnie z opisem i podanymi wymaganiami, a twórca nie naprawi błędu w ciągu 72 godzin od zgłoszenia — zwracamy pieniądze.</p>
      <h2 id="jak">Jak zgłosić problem</h2>
      <ol>
        <li>Załóż ticket w <Link href="/panel/tickety">panelu klienta</Link> (kategoria „Zwrot”) i podaj numer zamówienia.</li>
        <li>Opisz problem, dołącz logi konsoli i wersję serwera.</li>
        <li>Twórca ma 72 godziny na rozwiązanie problemu.</li>
      </ol>
      <h2 id="kiedy">Kiedy zwracamy środki</h2>
      <ul>
        <li>Produkt nie działa na wspieranej, opisanej konfiguracji i nie został naprawiony w 72 godziny.</li>
        <li>Produkt istotnie różni się od opisu.</li>
        <li>Zostałeś obciążony dwukrotnie za to samo zamówienie.</li>
      </ul>
      <p>Zwrot nie przysługuje, jeśli problem wynika z niewspieranej konfiguracji, modyfikacji kodu lub konfliktu z innymi zasobami, a także po naruszeniu zasad licencji. Po zwrocie licencja zostaje unieważniona.</p>
      <h2 id="czas">Czas zwrotu</h2>
      <p>Środki zwracamy tą samą metodą płatności w ciągu 14 dni od uznania zgłoszenia (zwykle 1–5 dni roboczych).</p>
    </LegalPage>
  );
}
