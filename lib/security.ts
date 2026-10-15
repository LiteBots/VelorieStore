import 'server-only';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from './db';
import { RateLimit } from '@/models';
import { hashIp } from './crypto';

/** IP klienta za proxy Railway (pierwszy adres z X-Forwarded-For). */
export function ipFrom(h: Headers): string {
  const xf = h.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return h.get('x-real-ip') || '0.0.0.0';
}

export async function clientIp(): Promise<string> {
  return ipFrom(await headers());
}

/**
 * Limit żądań oparty o MongoDB (działa przy wielu instancjach na Railway).
 * Zwraca true, gdy żądanie mieści się w limicie.
 */
export async function rateLimit(bucket: string, id: string, limit: number, windowSec: number): Promise<boolean> {
  await db();
  const key = `${bucket}:${hashIp(id)}`;
  const now = new Date();
  // Wygasły wpis zerujemy, aktywny inkrementujemy.
  try {
    await RateLimit.deleteOne({ key, expiresAt: { $lte: now } });
    const r = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowSec * 1000) } },
      { upsert: true, new: true },
    ).lean<any>();
    return (r?.count || 0) <= limit;
  } catch {
    // Wyścig dwóch równoległych upsertów (duplicate key) — przepuszczamy pojedyncze żądanie.
    return true;
  }
}

/** Blokuje żądania API z obcych domen (CSRF) — dla POST/PUT/DELETE z przeglądarki. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // np. żądania serwer-serwer
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const json = (data: unknown, status = 200, init?: ResponseInit) =>
  NextResponse.json(data, { status, ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers || {}) } });

export const fail = (message: string, status = 400) => json({ ok: false, error: message }, status);
