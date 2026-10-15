import 'server-only';

const API = 'https://discord.com/api/v10';
const bot = () => process.env.DISCORD_BOT_TOKEN;

async function call(path: string, init: RequestInit) {
  const token = bot();
  if (!token) return null;
  try {
    const r = await fetch(API + path, {
      ...init,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      cache: 'no-store',
    });
    return r;
  } catch (e) {
    console.error('[discord]', path, e);
    return null;
  }
}

/** Dodaje użytkownika do serwera Discord (wymaga scope guilds.join i bota na serwerze). */
export async function joinGuild(discordId: string, accessToken: string) {
  const guild = process.env.DISCORD_GUILD_ID;
  if (!guild || process.env.DISCORD_AUTO_JOIN !== 'true' || !accessToken) return;
  await call(`/guilds/${guild}/members/${discordId}`, { method: 'PUT', body: JSON.stringify({ access_token: accessToken }) });
}

/** Nadaje rolę kupującego po opłaconym zamówieniu. */
export async function giveBuyerRole(discordId: string) {
  const guild = process.env.DISCORD_GUILD_ID, role = process.env.DISCORD_BUYER_ROLE_ID;
  if (!guild || !role || !discordId) return;
  await call(`/guilds/${guild}/members/${discordId}/roles/${role}`, { method: 'PUT', headers: { 'X-Audit-Log-Reason': 'Zakup w Velorie Market' } });
}

/** Wysyła embed na webhook (sprzedaż, alerty). Webhook URL musi być z discord.com. */
export async function webhook(kind: 'sales' | 'alerts', embed: Record<string, unknown>) {
  const url = kind === 'sales' ? process.env.DISCORD_WEBHOOK_SALES : process.env.DISCORD_WEBHOOK_ALERTS;
  if (!url || !/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\//.test(url)) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Velorie Market', embeds: [{ color: 0x2f6bff, timestamp: new Date().toISOString(), ...embed }] }),
    });
  } catch (e) {
    console.error('[webhook]', e);
  }
}

export const avatarUrl = (id: string, avatar?: string | null) =>
  avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128` : null;
