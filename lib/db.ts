import 'server-only';
import mongoose from 'mongoose';

// Ochrona przed NoSQL injection: każde wejście od użytkownika przechodzi przez schematy zod
// (lib/validation.ts), więc do filtrów trafiają wyłącznie stringi i liczby, nigdy obiekty z operatorami $.
mongoose.set('strictQuery', true);

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = g.__mongoose || (g.__mongoose = { conn: null, promise: null });

export async function db() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Brak MONGODB_URI w zmiennych środowiskowych.');
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      dbName: process.env.MONGODB_DB || 'velorie',
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}
