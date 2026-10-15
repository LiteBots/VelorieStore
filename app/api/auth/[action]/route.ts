// Endpointy NextAuth: /api/auth/session, /api/auth/csrf, /api/auth/providers, /api/auth/signout, /api/auth/error
// (Zamiast folderu [...nextauth] — nazwy z kropkami gubią się przy wgrywaniu przez przeglądarkę GitHub.)
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
type Ctx = { params: Promise<{ action: string }> };

async function route(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  return handler(req, { params: { nextauth: [action] } });
}
export { route as GET, route as POST };
