import Groq from 'groq-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Groq model to use — llama-3.3-70b-versatile is fast, capable, and free-tier friendly
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  // Validate request body
  const { messages } = req.body as {
    messages?: Array<{ role: string; content: string }>;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Sanitise messages — only allow valid roles and string content
  const safeMessages = messages
    .filter((m) => ['user', 'assistant', 'system'].includes(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content.slice(0, 32_000) }));

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  try {
    const groq = new Groq({ apiKey });

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: safeMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    // Stream each chunk as SSE
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // SSE format: data: <json>\n\n
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Signal end of stream
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/chat] Groq error:', message);

    // If headers already sent (stream started), close gracefully
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    } else {
      const status = message.includes('rate limit') || message.includes('429') ? 429
        : message.includes('401') ? 401
        : 500;
      res.status(status).json({ error: message });
    }
  }
}
