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

type JsonObj = Record<string, unknown>;

function isObj(v: unknown): v is JsonObj {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Copy asset paths from the deploy seed into the persistent file without wiping text edits. */
function mergeAssetPaths(persistent: unknown, seed: unknown): { data: unknown; changed: boolean } {
  if (!isObj(persistent) || !isObj(seed)) return { data: persistent, changed: false };
  let changed = false;
  const out = structuredClone(persistent) as JsonObj;

  const seedJourney = Array.isArray(seed.journey) ? seed.journey : [];
  const outJourney = Array.isArray(out.journey) ? out.journey : [];
  for (const stop of outJourney) {
    if (!isObj(stop) || typeof stop.id !== 'string') continue;
    const fromSeed = seedJourney.find(s => isObj(s) && s.id === stop.id);
    if (!isObj(fromSeed)) continue;
    if (typeof fromSeed.imageSrc === 'string' && stop.imageSrc !== fromSeed.imageSrc) {
      stop.imageSrc = fromSeed.imageSrc;
      changed = true;
    }
  }

  const seedProjects = Array.isArray(seed.projects) ? seed.projects : [];
  const outProjects = Array.isArray(out.projects) ? out.projects : [];
  for (const proj of outProjects) {
    if (!isObj(proj) || typeof proj.id !== 'string') continue;
    const fromSeed = seedProjects.find(p => isObj(p) && p.id === proj.id);
    if (!isObj(fromSeed)) continue;
    if (typeof fromSeed.imageSrc === 'string' && proj.imageSrc !== fromSeed.imageSrc) {
      proj.imageSrc = fromSeed.imageSrc;
      changed = true;
    }
  }

  const seedInv = isObj(seed.invItems) && Array.isArray(seed.invItems.items) ? seed.invItems.items : [];
  const outInvRoot = isObj(out.invItems) ? out.invItems : null;
  const outInv = outInvRoot && Array.isArray(outInvRoot.items) ? outInvRoot.items : [];
  for (const item of outInv) {
    if (!isObj(item) || typeof item.key !== 'string' || !Array.isArray(item.photos)) continue;
    const fromSeed = seedInv.find(i => isObj(i) && i.key === item.key);
    if (!isObj(fromSeed) || !Array.isArray(fromSeed.photos)) continue;
    for (const photo of item.photos) {
      if (!isObj(photo) || typeof photo.id !== 'string') continue;
      const seedPhoto = fromSeed.photos.find(p => isObj(p) && p.id === photo.id);
      if (!isObj(seedPhoto)) continue;
      if (typeof seedPhoto.src === 'string' && photo.src !== seedPhoto.src) {
        photo.src = seedPhoto.src;
        changed = true;
      }
    }
  }

  return { data: out, changed };
}

async function readSeed(): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(SEED_FILE, 'utf8')) as unknown;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[content] failed to read seed ${SEED_FILE}: ${reason}`);
    return null;
  }
}

export async function readContentJson(): Promise<unknown | null> {
  const file = await ensureContentFile();
  let persistent: unknown | null = null;
  try {
    persistent = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
  } catch {
    // fall through to seed
  }

  const seed = await readSeed();
  if (persistent == null) return seed;

  if (seed != null) {
    const { data, changed } = mergeAssetPaths(persistent, seed);
    if (changed) {
      try {
        await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        console.log(`[content] synced asset paths into ${file}`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[content] could not write synced content.json: ${reason}`);
      }
      return data;
    }
  }

  return persistent;
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
