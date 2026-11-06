import { fal } from '@fal-ai/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/test-image
 * Sends a test prompt to fal.ai and returns the full result or exact error.
 * Remove this file after confirming image generation works.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    return res.status(500).json({ ok: false, stage: 'env', error: 'FAL_KEY is not set' });
  }

  const model = process.env.FAL_MODEL ?? 'fal-ai/flux/schnell';

  try {
    fal.config({ credentials: falKey });

    const result = await fal.subscribe(model, {
      input: {
        prompt: 'a small red circle on a white background',
        image_size: 'square_hd',
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
    });

    // Log raw result so we can see its shape
    console.log('[test-image] raw result:', JSON.stringify(result));

    return res.status(200).json({
      ok: true,
      model,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[test-image] error:', message);

    return res.status(500).json({
      ok: false,
      stage: 'fal_call',
      model,
      error: message,
      stack,
    });
  }
}
