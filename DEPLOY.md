# Deploying to the Hostinger VPS

1. On the VPS: install Node 18+, clone this repo, run `npm install` at the root (installs both workspaces).
2. Copy `server/.env.example` to `server/.env` and fill in `GEMINI_API_KEY` (get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
3. `npm run build` (builds the client to `client/dist`, compiles the server to `server/dist`).
4. Run with pm2: `pm2 start server/dist/index.js --name imajello` (or `npm start` from the repo root directly).
5. Point nginx at the Node process (default port 3000) as a reverse proxy, terminate TLS there with certbot for your domain.
6. To update: `git pull`, `npm run build`, `pm2 restart imajello`.

## Persistent data (scores + site copy)
Arcade scores (`leaderboard.json`) and editable site copy (`content.json`) both live in
`LEADERBOARD_DATA_DIR` / `DATA_DIR` (default: `server/data/`).

**Hostinger / clean redeploys:** if each push replaces the app folder, put the data
outside the deploy tree:

```bash
# File Manager: create imajello-data next to the nodejs/ folder
```

Then in Environment variables (hPanel → Website Dashboard → Environment variables):

```
LEADERBOARD_DATA_DIR=../imajello-data
```

Use that relative form on Hostinger Node apps — `cwd` is the `nodejs/` folder, so
`../imajello-data` is the sibling you created. Absolute paths also work if they start
with `/` and match the File Manager breadcrumb exactly.

On first boot the server copies `client/src/content.json` into that folder if missing.
After that, edit **`imajello-data/content.json`** in File Manager and hard-refresh the
site — no rebuild needed. Delete that file to re-seed from the next deploy’s copy.

After redeploy, check runtime logs for:
`[leaderboard] data dir: ...`
`[content] data file: ...`

### Leaderboard personal data
Submitters can optionally give a real first and last name. Those are stored in
`leaderboard.json` and are **never** returned by the API — `GET /api/leaderboard` and the
`POST` response both go through `toPublicEntry()`, which drops them, so the public board
only ever exposes arcade name, company, level and time.

Treat the file accordingly:
- Don't commit it, paste it into an issue, or copy it somewhere world-readable.
- Backups of it are backups of personal data — keep them off public storage.
- It is plaintext on disk, so anyone with SSH or VPS-console access can read it. That is the
  boundary of "private" here; there is no encryption at rest.
- If you ever add an admin or export endpoint, build it on `Entry`, not `PublicEntry`, and
  put real auth in front of it.

## Supplying real assets later
- Photos: drop files into `client/public/photos/` and set the `src` prop on the relevant `ImageSlot` usage (World Map: `WorldMapDialog.tsx`; Battle Log: `data/projects.ts`'s `imageSrc` field; Inventory: `InventoryDialog.tsx`'s gallery `ImageSlot`s).
- Resume: replace `client/public/Anjoelo_Calderon_Resume.pdf` with the real file (same filename, no code change needed).
- Fonts: if self-hosted woff2 files weren't available during development, replace the Google Fonts `<link>` in `client/index.html` with real self-hosted `@font-face` files in `client/src/styles/global.css`.

## Rift Pulls demo (`/projects/rift-pulls`)
A separate, fully static app ([rf-reactions](https://github.com/jelo-ca/rf-reactions): camera + card
recognition models running in the browser). Its ~140 MB of models, card images and data live
**outside this repo**, like `imajello-data`; the server mounts them when `RIFT_PULLS_DIR` is set.

1. In the rf-reactions repo: `cd app && npm run build:site`, then from the repo root
   `py scripts/package_site.py` → `out/rift-pulls-site.zip`.
2. File Manager: create `rift-pulls` next to the `nodejs/` folder, upload the zip into it and
   extract, so `rift-pulls/index.html` exists (not `rift-pulls/rift-pulls/index.html`).
3. Environment variables (hPanel): `RIFT_PULLS_DIR=../rift-pulls`, then redeploy/restart.
4. Check the runtime log for `[rift-pulls] /projects/rift-pulls -> ...`, then open
   `https://<domain>/projects/rift-pulls/` (HTTPS is required for the camera).

Updating the model or data: rebuild the zip and extract it over the folder; no site redeploy needed.
The server only adds `Cross-Origin-Opener-Policy`/`-Embedder-Policy` (multi-threaded wasm) under
that path, plus cache headers: hashed `assets/` for a year, models/data/images for a day.
If `RIFT_PULLS_DIR` is unset or has no `index.html`, the route is simply not mounted (logged).
