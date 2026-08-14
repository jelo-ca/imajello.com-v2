# Deploying to the Hostinger VPS

1. On the VPS: install Node 18+, clone this repo, run `npm install` at the root (installs both workspaces).
2. Copy `server/.env.example` to `server/.env` and fill in `GEMINI_API_KEY` (get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
3. `npm run build` (builds the client to `client/dist`, compiles the server to `server/dist`).
4. Run with pm2: `pm2 start server/dist/index.js --name imajello` (or `npm start` from the repo root directly).
5. Point nginx at the Node process (default port 3000) as a reverse proxy, terminate TLS there with certbot for your domain.
6. To update: `git pull`, `npm run build`, `pm2 restart imajello`.

## Leaderboard scores
Arcade scores are written to `server/data/leaderboard.json`, created on first submission.
It's gitignored, so it survives `git pull` and `pm2 restart` but is **not** in the repo —
a fresh clone onto a new box starts with an empty board. Back it up with the rest of the
VPS if the scores matter.

### That file holds personal data
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
