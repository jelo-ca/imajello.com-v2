import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default lives next to the server package (outside src/ and dist/) so a rebuild never
// wipes it. On Hostinger, set LEADERBOARD_DATA_DIR (or DATA_DIR) to a path *outside* the
// deploy folder so clean redeploys can't delete scores or the editable content.json.
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../data');

/** Shared persistent dir for leaderboard.json and content.json. */
export function resolveDataDir(): string {
  const fromEnv = (process.env.DATA_DIR ?? process.env.LEADERBOARD_DATA_DIR)?.trim();
  // Absolute paths (leading /) win. Relative ones (e.g. ../imajello-data) resolve from
  // process.cwd(), which on Hostinger is usually the nodejs/ app root — so a sibling
  // folder next to nodejs/ is "../imajello-data", not "imajello-data".
  if (!fromEnv) return DEFAULT_DATA_DIR;
  return path.isAbsolute(fromEnv) ? path.normalize(fromEnv) : path.resolve(process.cwd(), fromEnv);
}
