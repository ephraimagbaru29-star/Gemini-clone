import Groq from 'groq-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/test-chat
 * Sends a single test message to Groq and returns the full response + any errors.
 * Remove this file after confirming Groq works.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      stage: 'env',
      error: 'GROQ_API_KEY is not set',
    });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'Say exactly: GROQ_OK' }],
      stream: false,
      max_tokens: 20,
    });

    const text = completion.choices[0]?.message?.content ?? '(empty)';

    return res.status(200).json({
      ok: true,
      response: text,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[api/test-chat] error:', message);

    return res.status(500).json({
      ok: false,
      stage: 'groq_call',
      error: message,
      stack,
    });
  }
}
