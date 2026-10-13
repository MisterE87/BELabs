/**
 * @deprecated Prefer `npm run assets:capture:board-stats` (scripts/capture-board-stats-gallery.mjs),
 * which captures public light/dark plus the full logged-in gallery.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [join(__dirname, 'capture-board-stats-gallery.mjs')], {
	stdio: 'inherit',
	env: process.env,
});
process.exit(result.status ?? 1);
