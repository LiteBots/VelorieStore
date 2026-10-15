import 'server-only';
import { db } from './db';
import { Order } from '@/models';
import type { Point } from '@/components/admin/Chart';

/** Przychód dzienny z opłaconych zamówień (ostatnie N dni). Opcjonalnie tylko pozycje danego twórcy. */
export async function dailyRevenue(days = 30, seller?: string, share = 1): Promise<Point[]> {
  await db();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const pipeline: any[] = [{ $match: { status: 'paid', paidAt: { $gte: since } } }];
  if (seller) pipeline.push({ $unwind: '$items' }, { $match: { 'items.seller': seller } });
  pipeline.push({
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'Europe/Warsaw' } },
      v: { $sum: seller ? '$items.price' : '$total' },
      n: { $sum: 1 },
    },
  });
  const rows = await Order.aggregate(pipeline);
  const map = new Map<string, any>(rows.map((r: any) => [r._id, r]));
  const out: Point[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
    const r: any = map.get(key);
    out.push({ label: `${key.slice(8, 10)}.${key.slice(5, 7)}`, value: Math.round((r?.v || 0) * share * 100) / 100, count: r?.n || 0 });
  }
  return out;
}
