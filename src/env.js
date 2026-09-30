// Minimalny loader pliku .env (bez zależności)
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

module.exports = {
  PORT,
  BASE_URL,
  ROOT: path.join(__dirname, '..'),
  DB_FILE: process.env.DB_FILE || path.join(__dirname, '..', 'storage', 'velorie.db'),
  FILES_DIR: path.join(__dirname, '..', 'storage', 'files'),
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  SECURE_COOKIES: BASE_URL.startsWith('https://'),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',

  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER || 'demo').toLowerCase(),
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  PLATFORM_FEE_PERCENT: Number(process.env.PLATFORM_FEE_PERCENT ?? 10),
  MIN_PAYOUT: Math.round(Number(process.env.MIN_PAYOUT_PLN ?? 50) * 100),
  CURRENCY: 'PLN',
  MAX_PRODUCT_FILE_MB: Number(process.env.MAX_PRODUCT_FILE_MB || 500),
};
