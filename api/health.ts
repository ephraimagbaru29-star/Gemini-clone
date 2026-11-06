import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/health
 * Returns which environment variables are configured (not their values).
 * Use this to diagnose missing keys without exposing secrets.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const checks = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    FAL_KEY: !!process.env.FAL_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL ?? '(default: llama-3.3-70b-versatile)',
    FAL_MODEL: process.env.FAL_MODEL ?? '(default: fal-ai/flux/schnell)',
    NODE_VERSION: process.version,
    timestamp: new Date().toISOString(),
  };

  const allOk = checks.GROQ_API_KEY && checks.FAL_KEY;

  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    message: allOk
      ? 'All providers configured.'
      : 'Some environment variables are missing. Check the checks object.',
  });
}
