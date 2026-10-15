import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { License, Order, Ticket, User, Review } from '@/models';
import { fail } from '@/lib/security';

export const dynamic = 'force-dynamic';

/** RODO art. 20 — eksport danych użytkownika w formacie JSON. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail('Zaloguj się', 401);
  await db();
  const [u, orders, licenses, tickets, reviews] = await Promise.all([
    User.findById(user.id).select('-__v -lastIpHash').lean(),
    Order.find({ userId: user.id }).select('-__v -ipHash').lean(),
    License.find({ userId: user.id }).select('productSlug tier status servers.label servers.boundAt updatesUntil createdAt keyLast4').lean(),
    Ticket.find({ userId: user.id }).select('-__v').lean(),
    Review.find({ userId: user.id }).select('-__v').lean(),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: u, orders, licenses, tickets, reviews }, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="velorie-dane-${user.discordId}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
