import { mkdirSync, readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { packagesSchema, type GamePackage } from '@ng/shared';
import { DATA_DIR } from './paths';

export const PACKAGES_FILE = path.join(DATA_DIR, 'packages.json');

/** Re-read on every use (tiny file) so edits apply without a restart. An unreadable/old-format file counts as "no packages". */
export function loadPackages(): GamePackage[] {
  try {
    const parsed = packagesSchema.safeParse(JSON.parse(readFileSync(PACKAGES_FILE, 'utf8')));
    if (parsed.success) return parsed.data;
    console.error('packages.json is not in the current format, ignoring it:', parsed.error.issues[0]);
  } catch {
    /* missing file: first run */
  }
  return [];
}

/** Write-then-rename so a crash can't leave a half-written file. */
export async function savePackages(list: GamePackage[]) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, `.packages-${randomBytes(4).toString('hex')}.tmp`);
  await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await rename(tmp, PACKAGES_FILE);
}
