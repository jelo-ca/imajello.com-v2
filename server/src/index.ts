import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleChat } from './chat.js';
import { handleGetLeaderboard, handlePostScore, logLeaderboardPath, probeLeaderboardStorage } from './leaderboard.js';
import { ensureContentFile, handleGetContent, logContentPath, readContentJson } from './contentStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.set('trust proxy', 1);

app.use(express.json());
app.post('/api/chat', handleChat);
app.get('/api/leaderboard', handleGetLeaderboard);
app.post('/api/leaderboard', handlePostScore);
app.get('/api/content', handleGetContent);

const clientDist = path.resolve(__dirname, '../../client/dist');

// Don't auto-serve index.html — we inject the persistent content.json into it first.
app.use(express.static(clientDist, { index: false }));

app.get('/health', async (_req, res) => {
  const leaderboard = await probeLeaderboardStorage();
  res.json({ ok: true, leaderboard });
});

async function sendIndex(_req: express.Request, res: express.Response) {
  try {
    let html = await fs.readFile(path.join(clientDist, 'index.html'), 'utf8');
    const content = await readContentJson();
    if (content != null) {
      // Escape < so a content string can't break out of the script tag.
      const payload = JSON.stringify(content).replace(/</g, '\\u003c');
      html = html.replace(
        '</head>',
        `<script>window.__IMAJELLO_CONTENT__=${payload}</script>\n  </head>`,
      );
    }
    res.type('html').send(html);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    res.status(500).send(`Failed to load app: ${reason}`);
  }
}

app.get('/', sendIndex);
app.get('*', sendIndex);

app.listen(PORT, async () => {
  console.log(`Server listening on :${PORT}`);
  logLeaderboardPath();
  await ensureContentFile();
  logContentPath();
});
