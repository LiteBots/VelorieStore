# Velorie Store

Marketplace dla twórców i graczy: pluginy i mapy Minecraft, skrypty, mapy i interiory FiveM, mody, boty, grafiki — z wbudowanym **systemem licencji** (klucze `VEL-XXXX-XXXX-XXXX-XXXX` + publiczne API weryfikacji).

Wygląd: premium dark z kolorami marki `#ff0354` / `#7c3aed` i logo Velorie. Frontend ma własny system designu (`public/assets/css/app.css`), własny zestaw ikon SVG (`icons.js`) i wykresy SVG — bez Tailwinda, bez Chart.js i bez skryptów z CDN (z zewnątrz ładuje się tylko font Inter z Google Fonts i logo).

## Uruchomienie

Wymagany **Node.js 22.13+** (korzysta z wbudowanego `node:sqlite`). Projekt **nie ma żadnych zależności npm**.

```bash
cp .env.example .env      # opcjonalnie uzupełnij klucze
npm run seed              # dane demo (UWAGA: czyści bazę)
npm start                 # http://localhost:3000
```

Konta demo (hasło `demo1234`): `admin@velorie.store`, `nova@velorie.store` (twórca), `pixel@velorie.store`, `kreator@velorie.store`, `gracz@velorie.store` (kupujący).

Na produkcji uruchom bez `npm run seed` — baza utworzy się pusta. Pierwszemu kontu nadaj admina:
```bash
sqlite3 storage/velorie.db "UPDATE users SET is_admin=1 WHERE email='twoj@email.pl'"
```

## Co jest w środku

**Sklep**: strona główna, strona „Dla twórców” z kalkulatorem zarobków, regulamin (szablon), katalog z filtrami (kategorie, cena, darmowe, sortowanie), strona produktu (galeria, opis, changelog, recenzje ze zweryfikowanego zakupu), profil twórcy, koszyk z kodami rabatowymi, checkout, dokumentacja API licencji.

**Logowanie**: e-mail + hasło (scrypt), Google OAuth, Discord OAuth. Konta łączą się po e-mailu; w ustawieniach można podpiąć/odpiąć metody.

**Panel kupującego**: przegląd, biblioteka (pobieranie, klucze), licencje (aktywacje serwerów, reset/zwalnianie), transakcje, lista życzeń, ustawienia konta.

**Panel twórcy (biznesowy)**: statystyki (przychód brutto/netto, sprzedaże, konwersja, wykresy dzienne, top produkty, kategorie), produkty (edytor, okładka, galeria, plik do 500 MB, wersje i changelog), sprzedaż + eksport CSV, licencje klientów (unieważnianie, limity, ręczne wydawanie), kody rabatowe, recenzje, wypłaty, ustawienia sklepu.

**Administracja**: statystyki platformy, moderacja produktów i wyróżnienia, użytkownicy (blokady, admini), realizacja wypłat, pasek informacyjny (`/api/infobar` — ten sam format co w Velorie Market).

## Konfiguracja (.env)

| Zmienna | Opis |
|---|---|
| `BASE_URL` | Publiczny adres, np. `https://velorie.store` (ważne dla OAuth, Stripe i ciasteczek `Secure`) |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud → Credentials → OAuth client. Redirect: `{BASE_URL}/auth/google/callback` |
| `DISCORD_CLIENT_ID/SECRET` | Discord Developer Portal → OAuth2. Redirect: `{BASE_URL}/auth/discord/callback` |
| `PAYMENT_PROVIDER` | `demo` (płatność symulowana) lub `stripe` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Webhook: `{BASE_URL}/api/payments/stripe/webhook`, zdarzenie `checkout.session.completed` |
| `PLATFORM_FEE_PERCENT` | Prowizja platformy (domyślnie 10) |
| `MIN_PAYOUT_PLN` | Minimalna wypłata twórcy |

Inną bramkę (Przelewy24, PayU, tpay) dodasz jako plik w `src/payments/` z metodami `createPayment()` i `handleWebhook()` — wzorem jest `stripe.js`.

## API licencji

```
POST /api/v1/licenses/verify   { "license_key": "...", "product_id": 1, "identifier": "ip:port" }
POST /api/v1/licenses/deactivate
```
Przykłady w Java (Spigot), Lua (FiveM), JS i Pythonie są na stronie `/docs.html`.

## Struktura

```
server.js              serwer HTTP, routing, pliki statyczne
src/db.js              schemat SQLite
src/auth.js            hasła, sesje, OAuth Google/Discord
src/commerce.js        koszyk, zamówienia, licencje, salda
src/payments/          bramki płatności (demo, stripe)
src/routes/            API: auth, store, me, seller, admin, license-api
public/                strony HTML + assets (app.css, icons.js, app.js, panel*.js)
storage/               baza i prywatne pliki produktów (backupuj!)
scripts/seed.js        dane demonstracyjne
```

## Produkcja

- Postaw za nginx/Caddy z HTTPS; ustaw `client_max_body_size 500m` dla uploadu plików.
- Uruchamiaj przez `pm2` lub systemd, rób kopie `storage/` i `public/uploads/`.
- Płatności: przed startem przełącz `PAYMENT_PROVIDER` z `demo` na prawdziwą bramkę.
