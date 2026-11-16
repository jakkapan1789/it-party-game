import { timingSafeEqual } from 'node:crypto';

/** Constant-time compare against ADMIN_PIN (read lazily so .env is loaded first). */
export function pinMatches(given: string): boolean {
  const expected = process.env.ADMIN_PIN ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
