/**
 * Nadaje rolę admina użytkownikowi po Discord ID (musi się wcześniej zalogować na stronie).
 * Użycie:  MONGODB_URI="..." npm run make-admin -- 123456789012345678
 * Alternatywa: wpisz ID w zmiennej ADMIN_DISCORD_IDS — rola nada się przy logowaniu.
 */
import mongoose from 'mongoose';

async function main() {
  const id = process.argv[2];
  if (!/^\d{15,22}$/.test(id || '')) throw new Error('Podaj Discord ID, np. npm run make-admin -- 123456789012345678');
  await mongoose.connect(process.env.MONGODB_URI || '', { dbName: process.env.MONGODB_DB || 'velorie' });
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const r = await User.updateOne({ discordId: id }, { $set: { role: 'admin' } });
  console.log(r.matchedCount ? `Użytkownik ${id} jest teraz adminem.` : 'Nie znaleziono — zaloguj się najpierw na stronie.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
