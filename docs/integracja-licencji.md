# Integracja licencji Velorie w produkcie

Endpoint: `POST https://TWOJA-DOMENA/api/v1/licenses/verify`

```json
{ "key": "VLR-XXXX-XXXX-XXXX", "product": "slug-produktu", "server_id": "opcjonalny-stały-id", "server_name": "Mój serwer" }
```

Odpowiedzi:

| Kod | Treść |
|---|---|
| 200 | `{ "valid": true, "product": "...", "tier": "Pro", "servers": { "used": 1, "max": 3 }, "updates_until": null, "ts": 1760550000 }` |
| 403 | `{ "valid": false, "reason": "server_limit" \| "revoked" \| "wrong_product" }` |
| 404 | `{ "valid": false, "reason": "not_found" }` |
| 429 | `{ "valid": false, "reason": "rate_limited" }` (60 zapytań / min / IP) |

Każda odpowiedź ma nagłówki `X-Velorie-Timestamp` i `X-Velorie-Signature`:

```
signature = HEX( HMAC_SHA256( LICENSE_SIGNING_SECRET, timestamp + "." + body ) )
```

Sprawdzaj podpis i odrzucaj odpowiedzi starsze niż 5 minut. Sekret podpisu wkompiluj w zaszyfrowaną część produktu (escrow / obfuskacja) — nie umieszczaj go w otwartym configu.

Gdy nie podasz `server_id`, serwer jest identyfikowany po adresie IP (przechowywanym jako skrót).

## FiveM (Lua, server-side)

```lua
local KEY = GetConvar('velorie_key', '')
local PRODUCT = 'velomdt'

PerformHttpRequest('https://velorie.market/api/v1/licenses/verify', function(status, body, headers)
  local ok, data = pcall(json.decode, body or '')
  if status ~= 200 or not ok or not data or not data.valid then
    print(('^1[%s] Licencja nieprawidłowa: %s^0'):format(PRODUCT, data and data.reason or status))
    StopResource(GetCurrentResourceName())
    return
  end
  -- TODO: zweryfikuj headers['X-Velorie-Signature'] (HMAC-SHA256) w zaszyfrowanym pliku escrow
  print(('^2[%s] Licencja %s aktywna (%d/%d serwerów)^0'):format(PRODUCT, data.tier, data.servers.used, data.servers.max))
end, 'POST', json.encode({ key = KEY, product = PRODUCT, server_name = GetConvar('sv_hostname', 'FiveM') }),
  { ['Content-Type'] = 'application/json' })
```

## Minecraft (Java 21, Paper)

```java
HttpClient http = HttpClient.newHttpClient();
String body = "{\"key\":\"" + key + "\",\"product\":\"veloguilds\",\"server_id\":\"" + serverId + "\"}";
HttpRequest req = HttpRequest.newBuilder(URI.create("https://velorie.market/api/v1/licenses/verify"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body)).build();

http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).thenAccept(res -> {
  String ts = res.headers().firstValue("X-Velorie-Timestamp").orElse("");
  String sig = res.headers().firstValue("X-Velorie-Signature").orElse("");
  Mac mac = Mac.getInstance("HmacSHA256");
  mac.init(new SecretKeySpec(SIGNING_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
  String expected = HexFormat.of().formatHex(mac.doFinal((ts + "." + res.body()).getBytes(StandardCharsets.UTF_8)));
  boolean fresh = Math.abs(Instant.now().getEpochSecond() - Long.parseLong(ts)) < 300;
  if (!MessageDigest.isEqual(expected.getBytes(), sig.getBytes()) || !fresh || !res.body().contains("\"valid\":true")) {
    getLogger().severe("Licencja nieprawidłowa — wyłączam plugin.");
    Bukkit.getScheduler().runTask(this, () -> getServer().getPluginManager().disablePlugin(this));
  }
});
```
(Obsługę wyjątków `Mac` pominięto dla czytelności.)
