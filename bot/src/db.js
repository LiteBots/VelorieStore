import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { cfg } from './config.js';

mongoose.set('strictQuery', true);

const loose = (name, extra = {}) =>
  mongoose.models[name] || mongoose.model(name, new mongoose.Schema(extra, { strict: false, timestamps: true }));

// Te same kolekcje, z których korzysta aplikacja www.
export const Product = loose('Product');
export const License = loose('License');
export const User = loose('User');
export const Seller = loose('Seller');
export const Counter = mongoose.models.Counter || mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: Number }));
export const BotTicket = loose('BotTicket', {
  number: Number, guildId: String, channelId: { type: String, index: true }, userId: { type: String, index: true },
  category: String, status: { type: String, default: 'open' }, claimedBy: String, closedBy: String,
});

export async function connect() {
  await mongoose.connect(cfg.mongo, { dbName: cfg.dbName, serverSelectionTimeoutMS: 10000, maxPoolSize: 5 });
  console.log('[db] połączono z MongoDB');
}

/** Identyczny algorytm jak w lib/crypto.ts aplikacji (HMAC-SHA256 + LICENSE_PEPPER). */
export const hashKey = (key) => createHmac('sha256', cfg.pepper).update(String(key).trim().toUpperCase()).digest('hex');
export const KEY_RE = /^VLR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export async function nextSeq(name) {
  const r = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean();
  return r.seq;
}
