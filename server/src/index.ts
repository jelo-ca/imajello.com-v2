import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleChat } from './chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.post('/api/chat', handleChat);

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
