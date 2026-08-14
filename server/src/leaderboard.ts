import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lives outside src/ and dist/ so a rebuild never wipes it. Created on demand — there is
// no seed file to ship, and an empty board is a valid starting state.
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');

export interface Entry {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  company: string;
  level: number;
  timeMs: number;
  createdAt: string;
}

// How many rows survive in the file, and how many the client is ever shown. Keeping the
// file larger than the visible board means a run that just misses the top 20 isn't lost
// the moment someone above it is beaten and removed.
const MAX_STORED = 100;
const MAX_RETURNED = 20;

const MAX_LEVEL = 999;
const MAX_TIME_MS = 24 * 60 * 60 * 1000;

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5; // submissions per IP per window
const submitLog = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of submitLog) {
    const fresh = timestamps.filter(t => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) submitLog.delete(ip);
    else submitLog.set(ip, fresh);
  }
}, RATE_WINDOW_MS);

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submitLog.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  submitLog.set(ip, timestamps);
  return false;
}

// Higher level first, and among equal levels the faster climb. createdAt breaks the
// remaining ties so the ordering is stable across reads rather than depending on whatever
// order the file happened to be in — earlier submission holds the higher rank.
function compareEntries(a: Entry, b: Entry): number {
  if (a.level !== b.level) return b.level - a.level;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.createdAt < b.createdAt ? -1 : 1;
}

async function readEntries(): Promise<Entry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) return [];
    return parsed.entries as Entry[];
  } catch {
    // Missing file on first run, or a file that got corrupted somehow. Neither is worth
    // failing the request over — an unreadable board reads as an empty one.
    return [];
  }
}

// Every write funnels through this promise chain. Express handles requests concurrently,
// so two submissions arriving together would otherwise both read the old list and the
// second would clobber the first's entry.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(job, job);
  // Swallow rejections on the chain itself so one failed write doesn't poison every
  // write after it; the caller still sees the real rejection through `run`.
  writeQueue = run.catch(() => {});
  return run;
}

async function writeEntries(entries: Entry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Write-then-rename: rename is atomic on the same filesystem, so a crash mid-write
  // leaves the previous good file in place rather than a truncated one.
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ entries }, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

// Control characters would survive JSON round-tripping and render as invisible junk in
// the board, so they come out here rather than at render time.
function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

export async function handleGetLeaderboard(_req: Request, res: Response) {
  const entries = await readEntries();
  entries.sort(compareEntries);
  res.json({ entries: entries.slice(0, MAX_RETURNED) });
}

export async function handlePostScore(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'a score submission is required' });
    return;
  }

  // Five letters, cabinet style — the board's CLIMBER column is sized and styled for
  // exactly that. Mirrors INITIALS_LENGTH on the client, which can't be imported across
  // the workspace boundary, so the two have to be changed together. The 20-character cap
  // stays on cleanString rather than dropping to 5 so an over-long name is rejected
  // outright instead of being truncated and quietly accepted as something never typed.
  const displayName = cleanString(body.displayName, 20).toUpperCase();
  if (!/^[A-Z]{5}$/.test(displayName)) {
    res.status(400).json({ error: 'display name must be five letters A-Z' });
    return;
  }

  const level = Number(body.level);
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    res.status(400).json({ error: 'level is out of range' });
    return;
  }

  const timeMs = Math.round(Number(body.timeMs));
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs > MAX_TIME_MS) {
    res.status(400).json({ error: 'run time is out of range' });
    return;
  }

  if (rateLimited(req.ip ?? 'unknown')) {
    res.status(429).json({ error: 'too many submissions, try again shortly' });
    return;
  }

  const entry: Entry = {
    id: randomUUID(),
    displayName,
    firstName: cleanString(body.firstName, 30),
    lastName: cleanString(body.lastName, 30),
    company: cleanString(body.company, 40),
    level,
    timeMs,
    createdAt: new Date().toISOString(),
  };

  try {
    const { entries } = await enqueue(async () => {
      const stored = await readEntries();
      stored.push(entry);
      stored.sort(compareEntries);
      const trimmed = stored.slice(0, MAX_STORED);
      await writeEntries(trimmed);
      return { entries: trimmed };
    });

    // 1-based rank within the whole stored board, not just the returned slice — a run
    // that placed 30th should be told 30th rather than falling off the end silently.
    // null means the run didn't even make the stored 100, which the client reports as
    // saved-but-unplaced rather than pretending it ranked.
    const index = entries.findIndex(e => e.id === entry.id);
    res.json({
      entry,
      rank: index === -1 ? null : index + 1,
      entries: entries.slice(0, MAX_RETURNED),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'could not save score';
    res.status(500).json({ error: reason });
  }
}
