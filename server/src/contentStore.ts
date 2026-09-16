import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDataDir } from './dataDir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled seed shipped with the repo. Copied into the persistent data dir on first boot
// so Hostinger File Manager edits live outside the wipeable nodejs/ tree.
const SEED_FILE = path.resolve(__dirname, '../../client/src/content.json');

function contentFilePath(): string {
  return path.join(resolveDataDir(), 'content.json');
}

export async function ensureContentFile(): Promise<string> {
  const file = contentFilePath();
  try {
    await fs.access(file);
    return file;
  } catch {
    // First boot (or deleted by operator to re-seed from the deploy).
  }

  const dir = resolveDataDir();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.copyFile(SEED_FILE, file);
    console.log(`[content] seeded ${file} from ${SEED_FILE}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[content] could not seed content.json: ${reason}`);
  }
  return file;
}

export async function readContentJson(): Promise<unknown | null> {
  const file = await ensureContentFile();
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    // Persistent file missing/unreadable — fall back to the deploy seed so the site
    // still boots even if the data dir isn't writable (common Hostinger sandbox case).
  }
  try {
    const raw = await fs.readFile(SEED_FILE, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[content] failed to read seed ${SEED_FILE}: ${reason}`);
    return null;
  }
}

export function logContentPath(): void {
  console.log(`[content] data file: ${contentFilePath()}`);
}

export async function handleGetContent(_req: Request, res: Response) {
  const data = await readContentJson();
  if (data == null) {
    res.status(500).json({ error: 'content.json is missing or unreadable' });
    return;
  }
  res.json(data);
}
