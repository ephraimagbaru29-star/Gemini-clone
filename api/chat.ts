import Groq from 'groq-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// Vercel config — disable built-in body parser so we handle it manually
export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for browser fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  // Parse body — handle both pre-parsed object and raw string
  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const safeMessages = messages
    .filter((m) => ['user', 'assistant', 'system'].includes(m.role) && typeof m.content === 'string')
    .map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content.slice(0, 32_000),
    }));

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  try {
    const groq = new Groq({ apiKey });

    // SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Flush headers immediately so the client knows streaming started
    if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as { flushHeaders: () => void }).flushHeaders();
    }

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: safeMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/chat] Groq error:', message);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    } else {
      const status =
        message.includes('429') || message.toLowerCase().includes('rate limit') ? 429
        : message.includes('401') || message.toLowerCase().includes('invalid api key') ? 401
        : 500;
      res.status(status).json({ error: message });
    }
  }
}
