# VelorieStore

Działający marketplace zasobów cyfrowych: Node.js 24, natywna baza SQLite, frontend HTML/CSS/JavaScript. Bez zewnętrznych zależności npm. Styl na podstawie dostarczonych plików Velorie: granat, szklane powierzchnie, róż i fiolet. Oryginalne logo pobrane z dostarczonego adresu Imgur znajduje się lokalnie w `public/logo.png`.

## Najpierw uruchomienie na Railway

1. Rozpakuj ZIP. **Wyślij zawartość folderu `veloriestore` do głównego katalogu repozytorium GitHub** — pliki `Dockerfile`, `package.json` i `server.js` mają być w root repozytorium. Nie wysyłaj samego ZIP.
2. W Railway utwórz projekt z repozytorium GitHub. Projekt buduje się z dołączonego Dockerfile.
3. Dodaj **Volume do tej usługi z punktem montowania `/data`**. Przechowuje bazę, sesje, archiwa i okładki. Bez Volume dane mogą zniknąć po redeployu.
4. Ustaw Variables:

| Zmienna | Wartość |
|---|---|
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/data` |
| `ADMIN_EMAIL` | Twój e-mail administratora |
| `ADMIN_PASSWORD` | Własne losowe hasło, co najmniej 12 znaków |
| `SEED_DEMO` | `true` jeśli chcesz 8 przykładowych ofert, inaczej `false` |
| `TRUST_PROXY` | `true` dla standardowego proxy Railway |
| `APP_URL` | Pełny adres strony HTTPS, bez końcowego `/` |

5. Wygeneruj publiczną domenę dla usługi, ustaw jej adres w `APP_URL` i uruchom ponowne wdrożenie, jeśli jest potrzebne. Railway przekazuje `PORT`; aplikacja nasłuchuje na `0.0.0.0`.
6. Wejdź na `/login`, zaloguj się danymi z `ADMIN_EMAIL` i `ADMIN_PASSWORD`. Otwórz `/admin`.
7. W **Treści i podstrony** uzupełnij regulamin, politykę prywatności, opis operatora i kontakt. Dołączone treści prawne są oznaczonymi miejscami do uzupełnienia — nie gotową dokumentacją prawną.
8. W **Ustawienia** wpisz odbiorcę i numer rachunku do wpłat, kontakt, prowizję oraz teksty strony. Potwierdź przygotowanie treści i włącz sprzedaż.
9. Dodaj prawdziwe produkty i pliki ZIP. Oferty demonstracyjne można ukryć przyciskiem „Usuń demo z katalogu” w panelu produktów.

**Używaj jednej repliki usługi.** Ta wersja używa SQLite i plików na jednym Volume; nie jest przeznaczona do skalowania przez wiele instancji. Nie stosuj efemerycznego dysku zamiast Volume. Włącz kopie zapasowe Volume w Railway i przetestuj odtworzenie.

Oficjalna dokumentacja wdrożenia: https://docs.railway.com/builds/dockerfiles oraz https://docs.railway.com/volumes . Samo wdrożenie na konto Railway nie zostało wykonane w ramach przygotowania paczki.

## Jak działa płatność

Ta wersja ma **prawdziwy przepływ zamówień z przelewem tradycyjnym i ręcznym zatwierdzeniem**, nie symulowaną płatność kartą:

1. Kupujący składa zamówienie. Ceny, rabat, prowizja i uprawnienia są sprawdzane na serwerze.
2. Otrzymuje dane przelewu i unikalny tytuł `VS-ID_ZAMÓWIENIA` w szczegółach zamówienia.
3. Administrator sprawdza rzeczywisty wpływ środków i ustawia „Opłacone”.
4. Kupujący otrzymuje dostęp do plików i identyfikatorów licencji w bibliotece.
5. Sprzedawcy nalicza się kwota po prowizji. Może zlecić wypłatę na rachunek.
6. Administrator wykonuje przelew poza platformą i zapisuje stan wypłaty.

Produkty bezpłatne od razu trafiają do biblioteki, jeżeli sprzedaż jest uruchomiona. Zamówienie nieopłacone można anulować. Zwrot rejestruje się **po faktycznym wykonaniu zwrotu poza platformą**; cofa dostęp do pobierania oraz saldo sprzedawcy. Zwrot po wypłacie może spowodować ujemne saldo sprzedawcy — trzeba rozliczyć je z autorem. Wniosek o wypłatę nie może zostać opłacony przy ujemnym saldzie.

Nie podłączono Stripe, PayU, Przelewy24, BLIK, automatycznych payoutów ani faktur VAT. Wymagałoby to danych konta operatora, konfiguracji webhooków i modelu rozliczeń marketplace. Identyfikator licencji jest ewidencją zakupu, nie mechanizmem DRM ani serwerem licencji dla uruchamianych pluginów.

## Podstrony i panele

| Obszar | Adresy / funkcje |
|---|---|
| Marketplace | `/`, `/catalog`, wyszukiwarka, kategorie, sortowanie |
| Produkt | `/product/:id`, opis, wymagania, wersja, licencja, opinie po zakupie |
| Twórcy | `/creators`, `/creator/:id`, publiczny profil i oferty |
| Sprzedawaj | `/sell`, aktywacja konta twórcy |
| Koszyk | `/cart`, kod rabatowy, zamówienie |
| Konto | `/login`, `/register`, zmiana hasła w panelu |
| Informacje | `/page/about`, `/page/help`, `/page/terms`, `/page/privacy`, `/page/cookies` |
| Kupujący | `/panel`, `/panel/library`, `/panel/orders`, `/panel/favorites`, `/panel/tickets`, `/panel/settings` |
| Sprzedawca | `/panel/seller`, `/panel/products`, `/panel/new`, `/panel/edit/:id`, `/panel/sales`, `/panel/payouts` |
| Administrator | `/admin`, `/admin/products`, `/admin/edit/:id`, `/admin/users`, `/admin/orders`, `/admin/payouts`, `/admin/tickets`, `/admin/reviews`, `/admin/categories`, `/admin/coupons`, `/admin/pages`, `/admin/settings`, `/admin/audit` |

Panel administratora obejmuje edycję produktów, cen, opisów, licencji, plików, kategorii, wersji, statusów i wyróżnień; moderację; blokowanie użytkowników i role; obsługę płatności, zwrotów i wypłat; odpowiedzi w zgłoszeniach; ukrywanie opinii; kategorie i kody rabatowe; treści podstron oraz ustawienia. Historia operacji jest celowo nieedytowalna z panelu.

Każde konto po rejestracji jest kupującym. Może aktywować rolę twórcy. Nowe i edytowane oferty twórców wymagają ponownej moderacji. Konto administratora tworzone jest z ENV przy pierwszym uruchomieniu. Zmiana `ADMIN_PASSWORD` nie nadpisuje hasła już istniejącego konta — użyj formularza zmiany hasła albo narzędzia odzyskiwania.

Zgłoszenia to rozmowy z obsługą platformy; nie ma prywatnego komunikatora kupujący–sprzedawca ani powiadomień e-mail. Brak logowania Google/Discord i samodzielnego resetu hasła przez e-mail. To świadomie niewłączone integracje, a nie atrapy przycisków.

## Lokalne uruchomienie

Wymagany Node.js 24.x. Brak `npm install` — projekt korzysta wyłącznie z modułów dostarczanych z Node.

Linux / macOS:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='TwojeDlugieLosoweHaslo' SEED_DEMO=true npm start
```

PowerShell:

```powershell
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='TwojeDlugieLosoweHaslo'
$env:SEED_DEMO='true'
npm start
```

Otwórz http://localhost:3000. Lokalnie nie ustawiaj `NODE_ENV=production`, ponieważ ciasteczko produkcyjne wymaga HTTPS. Możesz skopiować `.env.example` do `.env`, zmienić wartości i uruchomić `node --env-file=.env server.js` (Node wczyta plik; `npm start` sam go nie wczytuje).

## Pliki i bezpieczeństwo

- Hasła: `scrypt` i osobna losowa sól dla każdego konta.
- Sesje serwerowe w SQLite, 7 dni, cookie HttpOnly, SameSite=Lax, Secure w produkcji.
- Token CSRF, sprawdzanie Origin, brak CORS dla obcych domen, limity prób logowania i uploadów.
- Sprawdzanie właściciela zasobu i roli na backendzie. Rola nie jest przechowywana w localStorage.
- Archiwa prywatne, dostęp wyłącznie przez kontroler pobierania po autoryzacji zakupu. Cofnięcie statusu płatności odbiera dostęp.
- Wyświetlany tekst escapowany; brak HTML z opisów użytkownika. CSP blokuje obce skrypty i osadzanie strony.
- Archiwa ZIP do 50 MB, obrazy PNG/JPG/WebP do 5 MB; weryfikacja rozszerzenia i sygnatury pliku. Serwer nie rozpakowuje i nie wykonuje przesłanego kodu.
- **Nie ma skanera antywirusowego ani automatycznej oceny bezpieczeństwa kodu.** Administrator powinien oceniać pliki przed publikacją. Weryfikacja sygnatury nie gwarantuje, że archiwum jest bezpieczne.
- Kupujący pobiera najnowsze archiwum produktu; warunki licencji i wersja z momentu zakupu są zapisane w zamówieniu. Starsze pliki pozostają na dysku, nie są automatycznie usuwane.
- Dane i przesłane pliki są w `DATA_DIR`, nigdy w katalogu publicznym ani repozytorium.
- Przetwarzanie uploadów odbywa się w pamięci; nie zwiększaj limitów bez dostosowania zasobów serwera. Dla dużych map i dużej skali dodaj streaming uploadu i magazyn obiektowy.

## Odzyskiwanie hasła

Uruchom w kontenerze/usłudze z dostępem do tego samego Volume:

```bash
RESET_EMAIL='konto@example.com' RESET_PASSWORD='NoweBardzoDlugieLosoweHaslo' node manage-user.js
```

Narzędzie zmienia hasło i unieważnia sesje. Nie wpisuj sekretów do plików repozytorium. Nie ma domyślnego publicznego hasła administratora.

## Testy

```bash
npm test
```

Test integracyjny używa osobnej tymczasowej bazy i sprawdza rejestrację, logowanie, role, upload, moderację, zakup, blokadę pobierania przed płatnością, udostępnienie po opłaceniu, odmowę dostępu innemu użytkownikowi, duplikaty zamówień, opinie, wypłaty, zwroty, zgłoszenia, CSRF, Origin i blokadę konta. Nie łączy się z prawdziwym operatorem płatności.

## Struktura projektu

```text
veloriestore/
  public/
    index.html     wspólny dokument dla podstron
    app.js         routing i interfejs wszystkich paneli
    style.css      wspólny responsywny styl
    logo.png       oryginalny lokalny logotyp
    favicon.svg    ikona aplikacji
  test/platform.test.js
  server.js        HTTP, API, autoryzacja, baza, pobieranie
  manage-user.js   administracyjne odzyskiwanie hasła
  Dockerfile
  railway.json
  package.json
  .env.example
  .gitignore
  .dockerignore
  README.md
```

Routing podstron obsługuje serwer; odświeżanie głębokich adresów działa. To pełny projekt serwerowy — nie uruchamiaj go jako GitHub Pages ani przez samo otwarcie `index.html`. Frontend renderuje się po stronie klienta; nie zawiera SSR, prerenderingu kart produktowych ani dynamicznych metadanych Open Graph per produkt.

## Weryfikacja dostarczonej wersji

Test integracyjny backendu zakończył się pomyślnie. Generowanie 33 podstron i zakładek sprawdzono w środowisku JavaScript z zastępczym DOM. Pełna kontrola wizualna w przeglądarce nie była możliwa: przeglądarka testowa nie była dostępna, a pobranie zostało zablokowane przez połączenie sieciowe. Przed udostępnieniem klientom sprawdź własną domenę na komputerze i telefonie, kompletny zakup prawdziwego produktu oraz pobranie archiwum.
