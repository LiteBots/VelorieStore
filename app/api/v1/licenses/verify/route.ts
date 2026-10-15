import { db } from '@/lib/db';
import { License } from '@/models';
import { verifySchema, firstError } from '@/lib/validation';
import { hashKey, hashIp, sign } from '@/lib/crypto';
import { ipFrom, rateLimit } from '@/lib/security';
import { licOf } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/**
 * Weryfikacja licencji z pluginu / skryptu / bota.
 *
 * POST /api/v1/licenses/verify
 * { "key": "VLR-XXXX-XXXX-XXXX", "product": "velomdt", "server_id": "opcjonalny-identyfikator" }
 *
 * Odpowiedź jest podpisana:  X-Velorie-Timestamp + X-Velorie-Signature = HMAC-SHA256(ts + "." + body, LICENSE_SIGNING_SECRET)
 * Klient powinien sprawdzić podpis i odrzucić odpowiedzi starsze niż 5 minut.
 * Gdy brak server_id, serwer jest identyfikowany po (zahashowanym) IP.
 */
function signed(data: Record<string, unknown>, status = 200) {
  const ts = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ ...data, ts: Number(ts) });
  let sig = '';
  try { sig = sign(body, ts); } catch { /* brak sekretu — odpowiedź bez podpisu */ }
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Velorie-Timestamp': ts, 'X-Velorie-Signature': sig },
  });
}

export async function POST(req: Request) {
  const ip = ipFrom(req.headers);
  try {
    if (!(await rateLimit('verify', ip, 60, 60))) return signed({ valid: false, reason: 'rate_limited' }, 429);
    const parsed = verifySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return signed({ valid: false, reason: 'bad_request', message: firstError(parsed.error) }, 400);
    const { key, product, server_id, server_name } = parsed.data;

    await db();
    const lic = await License.findOne({ keyHash: hashKey(key) });
    if (!lic) return signed({ valid: false, reason: 'not_found' }, 404);
    if (lic.status !== 'active') return signed({ valid: false, reason: 'revoked' }, 403);
    if (lic.productSlug !== product) return signed({ valid: false, reason: 'wrong_product' }, 403);

    const serverKey = server_id ? 'id:' + server_id : 'ip:' + hashIp(ip);
    const now = new Date();
    const existing = lic.servers.find((s: any) => s.id === serverKey);
    if (existing) {
      existing.lastSeenAt = now;
    } else {
      if (lic.servers.length >= lic.maxServers) {
        return signed({ valid: false, reason: 'server_limit', max_servers: lic.maxServers, message: 'Limit serwerów wyczerpany. Odepnij serwer w bibliotece zakupów.' }, 403);
      }
      lic.servers.push({ id: serverKey, label: server_name || (server_id ? server_id : 'serwer ' + ip.replace(/\.\d+$/, '.x')), boundAt: now, lastSeenAt: now });
    }
    lic.lastCheckAt = now;
    lic.checks = (lic.checks || 0) + 1;
    await lic.save();

    return signed({
      valid: true,
      product: lic.productSlug,
      tier: licOf(lic.tier).name,
      servers: { used: lic.servers.length, max: lic.maxServers },
      updates_until: lic.updatesUntil ? lic.updatesUntil.toISOString() : null,
    });
  } catch (e) {
    console.error('[verify]', e);
    return signed({ valid: false, reason: 'server_error' }, 500);
  }
}
