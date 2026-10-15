# Velorie Market

Marketplace pluginów Minecraft, skryptów FiveM, map, interiorów MLO i gotowych setupów — z licencjami, panelem klienta, panelem twórcy, panelem admina i botem Discord.

**Stack:** Next.js 15 (App Router) · React 19 · MongoDB (Mongoose) · NextAuth (Discord OAuth2) · Stripe (BLIK, Przelewy24, karty) · discord.js 14 · Railway

---

## Co jest w środku

| Obszar | Funkcje |
|---|---|
| **Sklep** | Strona główna z animowanym hero (silnik voxel 1:1 z projektu), katalog z filtrami, strony kategorii, strona produktu (galeria, licencje Standard/Pro/Network, kompatybilność, changelog, opinie), strony twórców, wyszukiwarka Ctrl+K, koszyk z kodami rabatowymi liczonymi na serwerze |
| **Płatności** | Stripe Checkout (BLIK, P24, karta) + webhook z weryfikacją podpisu; tryb testowy BLIK do developmentu; zgoda konsumencka na dostarczenie treści cyfrowej (art. 38 pkt 13 u.p.k.) |
| **Licencje** | Klucze `VLR-XXXX-XXXX-XXXX`, hash HMAC-SHA256 + szyfrowanie AES-256-GCM, limity serwerów, odpinanie serwerów (3×/mies.), publiczne API weryfikacji z podpisanymi odpowiedziami |
| **Panel klienta** `/panel` | Przegląd, biblioteka zakupów (klucze, serwery, pobieranie plików), zamówienia, tickety, ustawienia, eksport danych RODO, wniosek o usunięcie konta |
| **Panel twórcy** `/panel/tworca` | Przychód (85%), wykres 30 dni, top produkty, zamówienia z produktami twórcy |
| **Panel admina** `/admin` | Pulpit z KPI i wykresem, produkty (CRUD, changelog, prywatne pliki), zamówienia (ręczne opłacenie, zwrot = unieważnienie licencji), licencje, użytkownicy (role, bany), kupony, zgłoszenia twórców, tickety, wiadomości, moderacja opinii, dziennik zdarzeń |
| **Bot Discord** `/bot` | `/sklep`, `/produkt` (autouzupełnianie), `/licencja sprawdz|moje`, `/statystyki`, system ticketów z kanałami i transkrypcjami, panel weryfikacji, ogłoszenia, rola kupującego, powitania |
| **SEO** | Metadane per strona, Open Graph + dynamiczne obrazki OG produktów, JSON-LD (Organization, WebSite+SearchAction, Product+AggregateOffer, BreadcrumbList, ItemList, FAQPage), `sitemap.xml`, `robots.txt`, manifest, favicon SVG + apple-icon, kanoniczne URL-e |
| **Prawne** | Regulamin, polityka prywatności (RODO), polityka cookies, zwroty, baner cookies z wyborem kategorii |
| **Bezpieczeństwo** | Patrz sekcja niżej |

---

## 1. Discord — aplikacja i bot

1. Wejdź na <https://discord.com/developers/applications> → **New Application** (np. „Velorie Market”).
2. **OAuth2** → skopiuj **Client ID** i **Client Secret**.
   W **Redirects** dodaj:
   - `https://TWOJA-DOMENA/api/auth/callback/discord`
   - `http://localhost:3000/api/auth/callback/discord` (do testów lokalnych)
3. **Bot** → **Reset Token** → skopiuj token (podasz go w zmiennej `DISCORD_BOT_TOKEN`).
   Włącz **Privileged Gateway Intents**: **Server Members Intent** i **Message Content Intent**.
4. Zaproś bota na serwer (podmień `CLIENT_ID`):
   ```
   https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=268512272
   ```
   (Zarządzanie kanałami, rolami, wysyłanie wiadomości, załączniki, czytanie historii, tworzenie zaproszeń.)
   Rola bota musi być **wyżej** niż role, które ma nadawać (kupujący, zweryfikowany).
5. W Discordzie włącz *Ustawienia → Zaawansowane → Tryb dewelopera* i skopiuj ID: serwera, kategorii na tickety, kanału logów, kanału powitań, ról (support, zweryfikowany, kupujący).

## 2. Railway — wdrożenie

### a) Repozytorium
```bash
git init && git add . && git commit -m "Velorie Market"
git remote add origin https://github.com/TWOJ-LOGIN/velorie-market.git
git push -u origin main
```

### b) Baza danych
W projekcie Railway: **New → Database → MongoDB**. Skopiuj `MONGO_URL` (zakładka Variables bazy).

### c) Serwis WWW (Next.js)
1. **New → GitHub Repo** → wybierz repozytorium. Root Directory: `/` (domyślnie).
2. **Variables** — wklej wszystko z `.env.example` i uzupełnij:
   - `MONGODB_URI` = `${{MongoDB.MONGO_URL}}` (referencja do bazy), `MONGODB_DB=velorie`
   - sekrety wygeneruj lokalnie: `npm run gen-secrets` (lub `node scripts/gen-secrets.mjs`)
   - `ADMIN_DISCORD_IDS` = Twoje Discord ID (dostaniesz admina przy pierwszym logowaniu)
3. **Settings → Networking → Generate Domain** (lub podepnij własną). Ustaw `NEXT_PUBLIC_SITE_URL` i `NEXTAUTH_URL` na ten adres i zrób redeploy (zmienne `NEXT_PUBLIC_*` są wbudowywane przy buildzie).
4. Healthcheck jest ustawiony w `railway.json` na `/api/health`.

Przy pierwszym wejściu na stronę, gdy baza jest pusta, aplikacja sama wgra produkty demonstracyjne (możesz je potem edytować lub ukryć w panelu admina).

### d) Serwis bota
1. **New → GitHub Repo** → to samo repozytorium.
2. **Settings → Root Directory:** `/bot`.
3. **Variables** — z `bot/.env.example`. `MONGODB_URI`, `MONGODB_DB` i `LICENSE_PEPPER` **muszą być identyczne** jak w serwisie WWW.
4. Bot sam zarejestruje komendy po starcie. Na kanale wsparcia wpisz `/panel-ticketow`, na kanale weryfikacji `/panel-weryfikacji`.

### e) Stripe (płatności)
1. <https://dashboard.stripe.com> → włącz metody **BLIK** i **Przelewy24** (Settings → Payment methods).
2. Developers → API keys → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → **Add endpoint**: `https://TWOJA-DOMENA/api/webhooks/stripe`
   Zdarzenia: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` → skopiuj **Signing secret** do `STRIPE_WEBHOOK_SECRET`.
4. Do testów bez Stripe ustaw `ALLOW_DEMO_PAYMENTS=true` (płatność BLIK „na niby”). **Na produkcji ustaw `false`** — inaczej każdy dostanie licencję za darmo.

## 3. Uruchomienie lokalne
```bash
npm install
cp .env.example .env.local   # uzupełnij
npm run dev                  # http://localhost:3000

cd bot && npm install && cp .env.example .env && npm start
```
Po pierwszym `npm install` zatwierdź wygenerowany `package-lock.json` (i `bot/package-lock.json`) — Railway zbuduje wtedy dokładnie te same wersje.

Przydatne skrypty:
- `npm run seed` — wgrywa produkty demo (tylko brakujące)
- `npm run make-admin -- <DISCORD_ID>` — nadaje admina
- `npm run typecheck` — sprawdzenie typów TypeScript

---

## Bezpieczeństwo — co jest zrobione

- **Logowanie wyłącznie przez Discord OAuth2** — brak haseł w bazie; sesja w szyfrowanym JWT (httpOnly, Secure, SameSite=Lax).
- **Uprawnienia sprawdzane dwa razy:** middleware (`/panel`, `/admin`) + każda strona i każda akcja serwera (`requireUser` / `requireAdmin`). Role i bany odświeżane z bazy co minutę.
- **Klucze licencji:** w bazie tylko `HMAC-SHA256(klucz, LICENSE_PEPPER)` (wyszukiwanie) i szyfrogram AES-256-GCM (wyświetlanie właścicielowi). Wyciek bazy nie ujawnia kluczy.
- **Podpisane odpowiedzi API licencji** (`X-Velorie-Signature`, HMAC + znacznik czasu) — lokalny „fałszywy serwer licencji” nie przejdzie weryfikacji.
- **Prywatne pliki produktów** — `downloadUrl` nigdy nie trafia do przeglądarki; serwer strumieniuje plik tylko właścicielowi aktywnej licencji (limit 20 pobrań/h).
- **Ceny liczone wyłącznie na serwerze** (koszyk przeglądarki jest tylko podglądem), kody rabatowe walidowane na serwerze, realizacja zamówień idempotentna.
- **Webhook Stripe** z weryfikacją podpisu.
- **Walidacja wszystkich danych wejściowych (zod)** — do zapytań MongoDB trafiają tylko stringi/liczby (ochrona przed NoSQL injection), wyszukiwanie z escapowaniem regexów.
- **Rate limiting w MongoDB** (działa przy wielu instancjach): checkout, formularze, weryfikacja licencji, pobieranie, tickety.
- **CSRF:** akcje serwera Next.js (sprawdzanie Origin) + własny `sameOrigin` dla API; honeypot w formularzach.
- **Nagłówki:** CSP, HSTS (preload), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; `poweredByHeader` wyłączony.
- **Ochrona kodu:** brak map źródeł w produkcji, minifikacja, sekrety tylko po stronie serwera (`server-only`), panele z `noindex`.
- **Prywatność:** adresy IP tylko jako skróty HMAC, eksport danych (RODO art. 20), wniosek o usunięcie konta, dziennik zdarzeń administracyjnych.

## Integracja licencji w pluginach/skryptach
Zobacz `docs/integracja-licencji.md` — gotowe przykłady dla FiveM (Lua) i Minecraft (Java).

## Do uzupełnienia przed startem
- Dane firmy w zmiennych `NEXT_PUBLIC_COMPANY_*` (regulamin, polityka prywatności, stopka) i konsultacja dokumentów prawnych z prawnikiem.
- Sekcja „Serwery, które nam ufają” pokazuje przykładowe opinie, dopóki w bazie nie będzie co najmniej 6 prawdziwych recenzji 5★ — potem przełącza się automatycznie na prawdziwe.
- Liczby na stronie głównej (produkty, licencje, twórcy, ocena) są liczone z bazy na żywo.
- Linki do social mediów w `components/Footer.tsx`.
