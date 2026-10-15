import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Co } from '@/components/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Regulamin', description: 'Regulamin sklepu i platformy Velorie Market.', alternates: { canonical: '/regulamin' } };

const TOC: [string, string][] = [
  ['def', '1. Definicje'], ['ogolne', '2. Postanowienia ogólne'], ['konto', '3. Konto'], ['zamowienia', '4. Zamówienia i płatności'],
  ['licencje', '5. Licencje'], ['odstapienie', '6. Odstąpienie od umowy'], ['reklamacje', '7. Reklamacje i gwarancja'],
  ['tworcy', '8. Twórcy'], ['zakazy', '9. Zakazy'], ['koncowe', '10. Postanowienia końcowe'],
];

export default function Terms() {
  return (
    <LegalPage title="Regulamin" toc={TOC}>
      <p>Niniejszy regulamin określa zasady korzystania z serwisu <strong>{SITE.name}</strong> dostępnego pod adresem {SITE.url}, w tym zasady zawierania umów sprzedaży licencji na treści cyfrowe.</p>

      <h2 id="def">1. Definicje</h2>
      <ul>
        <li><strong>Usługodawca / Sprzedawca</strong> — <Co />.</li>
        <li><strong>Serwis</strong> — platforma internetowa {SITE.name} wraz z botem Discord.</li>
        <li><strong>Użytkownik</strong> — osoba korzystająca z Serwisu; <strong>Kupujący</strong> — Użytkownik, który złożył zamówienie.</li>
        <li><strong>Konsument</strong> — osoba fizyczna dokonująca zakupu niezwiązanego bezpośrednio z jej działalnością gospodarczą lub zawodową; przepisy o Konsumencie stosuje się także do przedsiębiorcy na prawach konsumenta (art. 38a ustawy o prawach konsumenta).</li>
        <li><strong>Produkt</strong> — treść cyfrowa (plugin, skrypt, mapa, interior, pojazd, bot, strona, grafika) udostępniana w Serwisie.</li>
        <li><strong>Licencja</strong> — niewyłączne prawo do korzystania z Produktu na zasadach z pkt 5, potwierdzone kluczem w formacie VLR-XXXX-XXXX-XXXX.</li>
        <li><strong>Twórca</strong> — zweryfikowany Użytkownik oferujący Produkty w Serwisie.</li>
      </ul>

      <h2 id="ogolne">2. Postanowienia ogólne</h2>
      <ol>
        <li>Do korzystania z Serwisu potrzebne jest urządzenie z dostępem do internetu, aktualna przeglądarka oraz konto Discord.</li>
        <li>Zakazane jest dostarczanie przez Użytkowników treści o charakterze bezprawnym.</li>
        <li>Ceny podane w Serwisie są cenami brutto w złotych polskich.</li>
        <li>Minecraft jest znakiem towarowym Mojang AB, FiveM — Cfx.re. Serwis nie jest powiązany z tymi podmiotami.</li>
      </ol>

      <h2 id="konto">3. Konto</h2>
      <ol>
        <li>Rejestracja i logowanie odbywają się wyłącznie przez Discord OAuth2. Serwis nie przechowuje haseł.</li>
        <li>Umowa o prowadzenie konta zawierana jest na czas nieokreślony. Użytkownik może w każdej chwili złożyć wniosek o usunięcie konta w panelu (Ustawienia).</li>
        <li>Usługodawca może zablokować konto Użytkownika naruszającego regulamin, w szczególności w przypadku udostępniania kluczy licencji lub plików osobom trzecim.</li>
      </ol>

      <h2 id="zamowienia">4. Zamówienia i płatności</h2>
      <ol>
        <li>Zamówienie składa się, dodając Produkty do koszyka, wybierając rodzaj Licencji i przechodząc do płatności.</li>
        <li>Dostępne metody płatności: BLIK, Przelewy24, karty płatnicze — obsługiwane przez Stripe Payments Europe Ltd.</li>
        <li>Umowa zostaje zawarta z chwilą zaksięgowania płatności. Klucz licencji i dostęp do plików są udostępniane niezwłocznie w bibliotece zakupów (panel → Moje zakupy).</li>
        <li>Na żądanie Kupującego wystawiamy fakturę — należy zgłosić to w tickecie w ciągu 30 dni od zakupu.</li>
      </ol>

      <h2 id="licencje">5. Licencje</h2>
      <ol>
        <li><strong>Standard</strong> — 1 serwer, aktualizacje przez 12 miesięcy. <strong>Pro</strong> — do 3 serwerów, aktualizacje dożywotnio. <strong>Network</strong> — bez limitu serwerów w ramach jednej sieci, prawo do modyfikacji na własny użytek.</li>
        <li>Licencja przypisuje się do serwera przy pierwszym uruchomieniu. Kupujący może odpiąć serwer w bibliotece zakupów do 3 razy w miesiącu.</li>
        <li>Zabronione jest odsprzedawanie, udostępnianie, publikowanie i dekompilowanie Produktów oraz obchodzenie zabezpieczeń licencyjnych. Naruszenie skutkuje unieważnieniem licencji bez zwrotu środków.</li>
        <li>Autorskie prawa majątkowe do Produktów pozostają przy Twórcach.</li>
      </ol>

      <h2 id="odstapienie">6. Odstąpienie od umowy</h2>
      <p>Konsumentowi co do zasady przysługuje prawo odstąpienia od umowy zawartej na odległość w terminie 14 dni. Zgodnie z art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta prawo to <strong>nie przysługuje</strong> w przypadku dostarczania treści cyfrowych niezapisanych na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą Konsumenta przed upływem terminu do odstąpienia i po poinformowaniu go o utracie tego prawa. Zgodę tę Kupujący wyraża, zaznaczając odpowiednie pole przed złożeniem zamówienia, a Sprzedawca potwierdza ją w historii zamówienia.</p>
      <p>Niezależnie od powyższego obowiązuje dobrowolna gwarancja działania opisana w pkt 7 oraz zasady opisane na stronie <Link href="/zwroty">Zwroty</Link>.</p>

      <h2 id="reklamacje">7. Reklamacje i gwarancja</h2>
      <ol>
        <li>Sprzedawca odpowiada za zgodność treści cyfrowej z umową na zasadach rozdziału 5b ustawy o prawach konsumenta.</li>
        <li>Dodatkowo udzielamy <strong>14-dniowej gwarancji działania</strong>: jeśli Produkt nie działa zgodnie z opisem i wymaganiami, a Twórca nie usunie błędu w ciągu 72 godzin od zgłoszenia, zwracamy pełną kwotę.</li>
        <li>Reklamacje przyjmujemy przez ticket w panelu, formularz <Link href="/kontakt">kontaktowy</Link> lub e-mail. Odpowiadamy w ciągu 14 dni.</li>
        <li>Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji, m.in. z pomocy powiatowego rzecznika konsumentów oraz Inspekcji Handlowej.</li>
      </ol>

      <h2 id="tworcy">8. Twórcy</h2>
      <ol>
        <li>Twórcą może zostać Użytkownik, którego zgłoszenie zostało zaakceptowane przez Usługodawcę.</li>
        <li>Twórca oświadcza, że posiada pełnię praw do oferowanych Produktów, w tym do wykorzystanych modeli, tekstur i bibliotek.</li>
        <li>Wynagrodzenie Twórcy wynosi 85% ceny netto sprzedanych licencji. Wypłaty realizowane są co tydzień po przekroczeniu 50 zł.</li>
        <li>Usługodawca może odmówić publikacji lub wycofać Produkt, który zawiera złośliwy kod, backdoory, narusza prawa osób trzecich lub nie działa zgodnie z opisem.</li>
      </ol>

      <h2 id="zakazy">9. Zakazy</h2>
      <p>Zabronione jest w szczególności: podejmowanie prób obejścia zabezpieczeń Serwisu, automatyczne pobieranie danych, przeciążanie API weryfikacji licencji, podszywanie się pod inne osoby oraz publikowanie treści naruszających prawo.</p>

      <h2 id="koncowe">10. Postanowienia końcowe</h2>
      <ol>
        <li>Zasady przetwarzania danych osobowych opisuje <Link href="/polityka-prywatnosci">polityka prywatności</Link>.</li>
        <li>Usługodawca może zmienić regulamin z ważnych przyczyn (zmiana przepisów, zmiana funkcji Serwisu), informując o tym z 7-dniowym wyprzedzeniem. Do zamówień złożonych wcześniej stosuje się regulamin dotychczasowy.</li>
        <li>W sprawach nieuregulowanych stosuje się przepisy prawa polskiego, w tym Kodeksu cywilnego i ustawy o prawach konsumenta.</li>
      </ol>
      <p className="muted" style={{ fontSize: 13 }}>Ten dokument jest wzorem przygotowanym dla Velorie Market. Przed startem sprzedaży uzupełnij dane firmy i skonsultuj treść z prawnikiem.</p>
    </LegalPage>
  );
}
