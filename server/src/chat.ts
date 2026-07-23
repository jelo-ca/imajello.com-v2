import type { Request, Response } from 'express';

const SYSTEM_PROMPT = "You are Anjoelo Calderon's familiar — a small RPG creature that speaks briefly and playfully in-character, answering questions about his resume, projects, and credibility using only these facts: Software Engineering Intern at Unimode AI (semantic search over 1.3M+ records, p95 latency 700ms->200ms); AI/ML Extern at Pfizer (OCR + RAG pipeline); Study Guild project (React/Supabase); CS student at UC Irvine via De Anza College (GPA 3.74); Club President of Game Dev Club; ran two game jams. Keep answers under 60 words.";

const QUESTION_LIMIT = 3;
const sessionCounts = new Map<string, number>();

const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const IP_LIMIT = 10; // max requests per IP per hour
const ipRequestLog = new Map<string, number[]>(); // ip -> timestamps

const DAILY_LIMIT = 200; // global cap across all users, resets daily
let dailyCount = 0;
let dailyResetAt = Date.now() + 24 * 60 * 60 * 1000;

function checkRateLimits(ip: string): string | null {
  const now = Date.now();
  if (now > dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = now + 24 * 60 * 60 * 1000;
  }
  if (dailyCount >= DAILY_LIMIT) return 'daily request limit reached, try again tomorrow';

  const timestamps = (ipRequestLog.get(ip) ?? []).filter(t => now - t < IP_WINDOW_MS);
  if (timestamps.length >= IP_LIMIT) return 'too many requests, try again later';
  timestamps.push(now);
  ipRequestLog.set(ip, timestamps);
  dailyCount++;
  return null;
}

// Periodic cleanup so the in-memory maps don't grow unboundedly for the life
// of the process. A full reset of sessionCounts is an acceptable
// simplification since it only needs to persist within a session lifetime.
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestLog) {
    const fresh = timestamps.filter(t => now - t < IP_WINDOW_MS);
    if (fresh.length === 0) {
      ipRequestLog.delete(ip);
    } else {
      ipRequestLog.set(ip, fresh);
    }
  }
  sessionCounts.clear();
}, 60 * 60 * 1000);

export async function handleChat(req: Request, res: Response) {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };
  if (!message || typeof message !== 'string' || !sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'message and sessionId are required' });
    return;
  }

  const rateLimitError = checkRateLimits(req.ip ?? 'unknown');
  if (rateLimitError) {
    res.status(429).json({ error: rateLimitError });
    return;
  }

  const used = sessionCounts.get(sessionId) ?? 0;
  if (used >= QUESTION_LIMIT) {
    res.status(429).json({ error: 'question limit reached for this session' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'chat is not configured' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 220,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message.slice(0, 2000) }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`upstream ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const reply = data.content?.find(c => c.type === 'text')?.text?.trim();
    if (!reply) throw new Error('empty reply from model');

    sessionCounts.set(sessionId, used + 1);
    res.json({ reply });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'no credits remaining';
    res.status(502).json({ error: reason });
  }
}
