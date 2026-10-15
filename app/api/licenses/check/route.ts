import { db } from '@/lib/db';
import { License, Product } from '@/models';
import { licenseKeySchema } from '@/lib/validation';
import { hashKey } from '@/lib/crypto';
import { fail, ipFrom, json, rateLimit, sameOrigin } from '@/lib/security';
import { licOf } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** Publiczne sprawdzanie klucza na stronie /licencje — bez danych osobowych i adresów serwerów. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('Niedozwolone źródło żądania', 403);
  try {
    if (!(await rateLimit('lic-check', ipFrom(req.headers), 12, 60))) return fail('Za dużo sprawdzeń, odczekaj minutę', 429);
    const body = await req.json().catch(() => ({}));
    const parsed = licenseKeySchema.safeParse(body?.key);
    if (!parsed.success) return fail('Klucz ma postać VLR-XXXX-XXXX-XXXX: litery i cyfry.');
    await db();
    const lic = await License.findOne({ keyHash: hashKey(parsed.data) }).lean<any>();
    if (!lic) return json({ ok: true, found: false });
    const p = await Product.findOne({ slug: lic.productSlug }).lean<any>();
    return json({
      ok: true,
      found: true,
      status: lic.status,
      product: p ? { slug: p.slug, name: p.name, version: p.version, art: p.art, cat: p.cat, imageUrl: p.imageUrl || null } : null,
      tier: licOf(lic.tier).name,
      servers: { used: lic.servers?.length || 0, max: lic.maxServers },
      updatesUntil: lic.updatesUntil ? new Date(lic.updatesUntil).toISOString().slice(0, 10) : null,
      issued: new Date(lic.createdAt).toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error('[lic-check]', e);
    return fail('Nie udało się sprawdzić klucza', 500);
  }
}
