# Deploying to the Hostinger VPS

1. On the VPS: install Node 18+, clone this repo, run `npm install` at the root (installs both workspaces).
2. Copy `server/.env.example` to `server/.env` and fill in `ANTHROPIC_API_KEY`.
3. `npm run build` (builds the client to `client/dist`, compiles the server to `server/dist`).
4. Run with pm2: `pm2 start server/dist/index.js --name imajello` (or `npm start` from the repo root directly).
5. Point nginx at the Node process (default port 3000) as a reverse proxy, terminate TLS there with certbot for your domain.
6. To update: `git pull`, `npm run build`, `pm2 restart imajello`.

## Supplying real assets later
- Photos: drop files into `client/public/photos/` and set the `src` prop on the relevant `ImageSlot` usage (World Map: `WorldMapDialog.tsx`; Battle Log: `data/projects.ts`'s `imageSrc` field; Inventory: `InventoryDialog.tsx`'s gallery `ImageSlot`s).
- Resume: replace `client/public/Anjoelo_Calderon_Resume.pdf` with the real file (same filename, no code change needed).
- Fonts: if self-hosted woff2 files weren't available during development, replace the Google Fonts `<link>` in `client/index.html` with real self-hosted `@font-face` files in `client/src/styles/global.css`.
