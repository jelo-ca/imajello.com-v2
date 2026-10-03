import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

// Rift Pulls (github.com/jelo-ca/rf-reactions): a static, fully client-side app (camera + ONNX
// models in the browser), served from a folder outside the deploy tree like imajello-data.
// Build it there with `npm run build:site` + `scripts/package_site.py`, unzip into RIFT_PULLS_DIR.
export const RIFT_PULLS_PATH = '/projects/rift-pulls';

/** Folder holding the unzipped build (index.html at its root), or null when not configured. */
export function resolveRiftPullsDir(): string | null {
  const fromEnv = process.env.RIFT_PULLS_DIR?.trim();
  if (!fromEnv) return null;
  // Same rules as resolveDataDir: absolute wins, relative resolves from process.cwd()
  // (on Hostinger the nodejs/ folder, so a sibling folder is "../rift-pulls").
  return path.isAbsolute(fromEnv) ? path.normalize(fromEnv) : path.resolve(process.cwd(), fromEnv);
}

// Cross-origin isolation lets onnxruntime-web use multi-threaded wasm. Only on this path, so the
// rest of the site can keep embedding third-party content.
const isolation: express.RequestHandler = (_req, res, next) => {
  res.set({
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  next();
};

function cacheHeaders(res: express.Response, file: string) {
  const rel = file.split(path.sep).join('/');
  if (rel.endsWith('/index.html')) res.setHeader('Cache-Control', 'no-cache');
  else if (rel.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // hashed names
  else res.setHeader('Cache-Control', 'public, max-age=86400'); // models, data, card images, memes
}

/** Mount the app before the site's catch-all. Logs and skips when the folder isn't there. */
export function mountRiftPulls(app: express.Express): void {
  const dir = resolveRiftPullsDir();
  if (!dir) {
    console.log('[rift-pulls] RIFT_PULLS_DIR not set, not mounted');
    return;
  }
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    console.warn(`[rift-pulls] no index.html in ${dir}, not mounted`);
    return;
  }
  app.use(RIFT_PULLS_PATH, isolation, express.static(dir, { setHeaders: cacheHeaders }));
  // A missing model/data file must 404, not fall through to the portfolio's index.html.
  app.use(RIFT_PULLS_PATH, (_req, res) => {
    res.status(404).type('text').send('Not found');
  });
  console.log(`[rift-pulls] ${RIFT_PULLS_PATH} -> ${dir}`);
}
