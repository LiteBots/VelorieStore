import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Product, Audit } from '@/models';
import { fail, ipFrom, rateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Pobieranie plików produktu. Adres pliku (downloadUrl) jest prywatny — serwer pobiera plik
 * i przekazuje go dalej tylko właścicielowi aktywnej licencji. Klient nigdy nie widzi źródła.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return fail('Zaloguj się', 401);
  if (!/^[a-f0-9]{24}$/.test(id)) return fail('Niepoprawny identyfikator', 400);
  if (!(await rateLimit('download', ipFrom(req.headers), 20, 3600))) return fail('Limit pobrań na godzinę został wyczerpany', 429);

  await db();
  const lic = await License.findOne({ _id: id, userId: user.id, status: 'active' }).lean<any>();
  if (!lic) return fail('Licencja nie istnieje lub została unieważniona', 404);
  const p = await Product.findOne({ slug: lic.productSlug }).select('+downloadUrl name version slug').lean<any>();
  if (!p?.downloadUrl) return fail('Twórca nie dodał jeszcze pliku do pobrania. Napisz ticket — prześlemy go ręcznie.', 404);

  const upstream = await fetch(p.downloadUrl, {
    headers: process.env.DOWNLOAD_AUTH_HEADER ? { Authorization: process.env.DOWNLOAD_AUTH_HEADER } : {},
    cache: 'no-store',
  });
  if (!upstream.ok || !upstream.body) return fail('Plik jest chwilowo niedostępny', 502);

  await Audit.create({ actor: user.name, actorId: user.discordId, action: 'download', target: p.slug, meta: { license: lic.keyLast4, version: p.version } });
  const ext = (p.downloadUrl.split('?')[0].match(/\.(zip|jar|rar|7z|rpf)$/i)?.[1] || 'zip').toLowerCase();
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${p.slug}-v${String(p.version).replace(/[^0-9a-z.]/gi, '')}.${ext}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
