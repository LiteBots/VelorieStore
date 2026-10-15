import 'dotenv/config';

const req = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`[config] Brak zmiennej ${k}`);
    process.exit(1);
  }
  return v;
};

export const cfg = {
  token: req('DISCORD_BOT_TOKEN'),
  clientId: req('DISCORD_CLIENT_ID'),
  guildId: process.env.DISCORD_GUILD_ID || '',
  mongo: req('MONGODB_URI'),
  dbName: process.env.MONGODB_DB || 'velorie',
  pepper: req('LICENSE_PEPPER'),
  site: (process.env.SITE_URL || 'https://velorie.market').replace(/\/$/, ''),
  ticketCategory: process.env.TICKET_CATEGORY_ID || '',
  ticketLog: process.env.TICKET_LOG_CHANNEL_ID || '',
  supportRole: process.env.SUPPORT_ROLE_ID || '',
  verifiedRole: process.env.VERIFIED_ROLE_ID || '',
  buyerRole: process.env.BUYER_ROLE_ID || '',
  welcome: process.env.WELCOME_CHANNEL_ID || '',
  color: 0x2f6bff,
};
