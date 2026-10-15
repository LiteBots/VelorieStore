import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Ochrona tras: /panel wymaga zalogowania, /admin wymaga roli admin.
// Layouty sprawdzają uprawnienia drugi raz po stronie serwera (obrona w głąb).
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.banned) {
    const url = req.nextUrl.clone();
    url.pathname = '/logowanie';
    url.search = `?next=${encodeURIComponent(pathname + search)}${token?.banned ? '&error=banned' : ''}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin') && token.role !== 'admin') {
    return NextResponse.rewrite(new URL('/404', req.url));
  }
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = { matcher: ['/panel/:path*', '/admin/:path*'] };
