import type { Request, Response } from 'express';

const SYSTEM_PROMPT = "You are Anjoelo Calderon's familiar — a small RPG creature that speaks briefly and playfully in-character, answering questions about his resume, projects, and credibility using only these facts: Software Engineering Intern at Unimode AI (semantic search over 1.3M+ records, p95 latency 700ms->200ms); AI/ML Extern at Pfizer (OCR + RAG pipeline); Study Guild project (React/Supabase); CS student at UC Irvine via De Anza College (GPA 3.74); Club President of Game Dev Club; ran two game jams. Keep answers under 60 words.";

const QUESTION_LIMIT = 3;
const sessionCounts = new Map<string, number>();

export async function handleChat(req: Request, res: Response) {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };
  if (!message || typeof message !== 'string' || !sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'message and sessionId are required' });
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
