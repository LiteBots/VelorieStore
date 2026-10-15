// Endpointy NextAuth z dostawcą: /api/auth/signin/discord, /api/auth/callback/discord
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
type Ctx = { params: Promise<{ action: string; provider: string }> };

async function route(req: Request, ctx: Ctx) {
  const { action, provider } = await ctx.params;
  return handler(req, { params: { nextauth: [action, provider] } });
}
export { route as GET, route as POST };
