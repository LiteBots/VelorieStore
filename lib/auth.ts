import 'server-only';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { redirect, notFound } from 'next/navigation';
import { db } from './db';
import { User, Audit } from '@/models';
import { avatarUrl, joinGuild } from './discord';

const admins = () =>
  (process.env.ADMIN_DISCORD_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: { params: { scope: 'identify email guilds.join' } },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/logowanie', error: '/logowanie' },
  cookies: undefined, // domyślne ciasteczka next-auth: httpOnly, secure (https), sameSite=lax
  callbacks: {
    async signIn({ account, profile }) {
      const p = profile as any;
      if (!p?.id) return false;
      await db();
      const existing = await User.findOne({ discordId: p.id }).lean<any>();
      if (existing?.banned) return '/logowanie?error=banned';
      const set: Record<string, unknown> = {
        username: p.username,
        globalName: p.global_name || null,
        avatar: p.avatar || null,
        email: p.email || null,
        lastLoginAt: new Date(),
      };
      if (admins().includes(p.id)) set.role = 'admin';
      await User.findOneAndUpdate({ discordId: p.id }, { $set: set }, { upsert: true, setDefaultsOnInsert: true });
      if (!existing) await Audit.create({ actor: p.username, actorId: p.id, action: 'user.register' });
      if (account?.access_token) joinGuild(p.id, account.access_token).catch(() => {});
      return true;
    },
    async jwt({ token, account, profile }) {
      const t = token as any;
      if (account && profile) {
        t.discordId = (profile as any).id;
        t.refreshedAt = 0;
      }
      // Co minutę odświeżamy rolę i blokadę z bazy, żeby zmiany z panelu admina działały bez wylogowania.
      if (t.discordId && Date.now() - (t.refreshedAt || 0) > 60_000) {
        try {
          await db();
          const u = await User.findOne({ discordId: t.discordId }).lean<any>();
          if (!u || u.banned) t.banned = true;
          else {
            t.banned = false;
            t.uid = String(u._id);
            t.role = u.role;
            t.sellerSlug = u.sellerSlug || null;
            t.name = u.globalName || u.username;
            t.picture = avatarUrl(u.discordId, u.avatar);
          }
          t.refreshedAt = Date.now();
        } catch (e) {
          console.error('[auth] refresh', e);
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as any;
      session.user = {
        id: t.uid,
        discordId: t.discordId,
        name: t.name,
        image: t.picture || null,
        role: t.role || 'user',
        sellerSlug: t.sellerSlug || null,
        banned: !!t.banned,
      } as any;
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  discordId: string;
  name: string;
  image: string | null;
  role: 'user' | 'creator' | 'admin';
  sellerSlug: string | null;
  banned: boolean;
}

export async function getUser(): Promise<SessionUser | null> {
  const s = await getServerSession(authOptions);
  const u = s?.user as SessionUser | undefined;
  if (!u?.id || u.banned) return null;
  return u;
}

export async function requireUser(next = '/panel'): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/logowanie?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await getUser();
  if (!u || u.role !== 'admin') notFound();
  return u;
}

export async function audit(actor: SessionUser | null, action: string, target?: string, meta?: unknown) {
  try {
    await Audit.create({ actor: actor?.name, actorId: actor?.discordId, action, target, meta });
  } catch {}
}
