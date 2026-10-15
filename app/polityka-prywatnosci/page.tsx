import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Co } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Polityka prywatności', description: 'Jak Velorie Market przetwarza dane osobowe (RODO).', alternates: { canonical: '/polityka-prywatnosci' } };

const TOC: [string, string][] = [
  ['admin', 'Administrator'], ['dane', 'Jakie dane'], ['cele', 'Cele i podstawy'], ['odbiorcy', 'Odbiorcy'],
  ['czas', 'Okres przechowywania'], ['prawa', 'Twoje prawa'], ['bezpieczenstwo', 'Bezpieczeństwo'], ['cookies', 'Cookies'],
];

export default function Privacy() {
  return (
    <LegalPage title="Polityka prywatności" toc={TOC}>
      <h2 id="admin">Administrator danych</h2>
      <p>Administratorem Twoich danych osobowych jest <Co />. W sprawach danych osobowych pisz na adres e-mail powyżej lub przez <Link href="/kontakt">formularz kontaktowy</Link>.</p>

      <h2 id="dane">Jakie dane przetwarzamy</h2>
      <ul>
        <li><strong>Dane z Discorda</strong> przy logowaniu: identyfikator, nazwa użytkownika, awatar, adres e-mail (zakres OAuth2 <code>identify email</code>). Jeśli włączone jest automatyczne dołączanie, także uprawnienie <code>guilds.join</code> — używamy go wyłącznie, by dodać Cię do naszego serwera Discord.</li>
        <li><strong>Dane zamówień</strong>: kupione produkty, kwoty, status płatności, identyfikator transakcji Stripe. Danych karty nie przetwarzamy — obsługuje je Stripe.</li>
        <li><strong>Dane licencji</strong>: klucz (przechowywany wyłącznie jako skrót HMAC-SHA256 oraz w postaci zaszyfrowanej AES-256-GCM), identyfikatory serwerów, na których używasz licencji.</li>
        <li><strong>Dane techniczne</strong>: skrót (hash) adresu IP używany do ochrony przed nadużyciami i limitowania żądań. Nie przechowujemy pełnych adresów IP.</li>
        <li><strong>Formularze</strong>: imię/nick, e-mail i treść wiadomości z formularza kontaktowego, zgłoszenia twórcy i ticketów; adres e-mail z newslettera.</li>
      </ul>

      <h2 id="cele">Cele i podstawy prawne</h2>
      <ul>
        <li>Założenie i prowadzenie konta, realizacja zamówień i licencji — art. 6 ust. 1 lit. b RODO (umowa).</li>
        <li>Rozliczenia podatkowe i księgowe — art. 6 ust. 1 lit. c RODO (obowiązek prawny).</li>
        <li>Bezpieczeństwo, zapobieganie nadużyciom, dochodzenie roszczeń — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).</li>
        <li>Odpowiedź na wiadomość i newsletter — art. 6 ust. 1 lit. a RODO (zgoda), którą możesz wycofać w każdej chwili.</li>
      </ul>

      <h2 id="odbiorcy">Odbiorcy danych</h2>
      <p>Dane powierzamy podmiotom, które pomagają nam prowadzić Serwis: Railway Corp. (hosting aplikacji i bazy danych), Stripe Payments Europe Ltd. (płatności), Discord Inc. (logowanie, powiadomienia). Część z nich może przetwarzać dane poza EOG na podstawie standardowych klauzul umownych Komisji Europejskiej.</p>

      <h2 id="czas">Okres przechowywania</h2>
      <ul>
        <li>Dane konta — do czasu usunięcia konta.</li>
        <li>Dane zamówień — 5 lat od końca roku podatkowego (przepisy podatkowe).</li>
        <li>Wiadomości i tickety — do 3 lat (okres przedawnienia roszczeń).</li>
        <li>Dane do limitowania żądań — automatycznie usuwane po upływie okna limitu (minuty–godziny).</li>
      </ul>

      <h2 id="prawa">Twoje prawa</h2>
      <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia (eksport JSON w panelu: Ustawienia → Pobierz moje dane), sprzeciwu oraz cofnięcia zgody. Przysługuje Ci skarga do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>

      <h2 id="bezpieczenstwo">Bezpieczeństwo</h2>
      <p>Stosujemy szyfrowanie połączeń (HTTPS/HSTS), nagłówki bezpieczeństwa (CSP, X-Frame-Options), szyfrowanie i hashowanie kluczy licencji, ochronę formularzy przed botami i limity żądań. Dostęp do panelu administracyjnego jest ograniczony do wskazanych kont i logowany.</p>

      <h2 id="cookies">Pliki cookie</h2>
      <p>Szczegóły znajdziesz w <Link href="/polityka-cookies">polityce cookies</Link>. Serwis {SITE.name} nie sprzedaje danych osobowych.</p>
    </LegalPage>
  );
}
