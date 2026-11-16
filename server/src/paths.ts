import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Must live at the top of src/ so it sits at the same depth as dist/index.js after bundling.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Overridable so a deploy can point them at a persistent volume.
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(ROOT, 'server/uploads');
export const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, 'server/data');
export const CLIENT_DIST = path.join(ROOT, 'client/dist');
