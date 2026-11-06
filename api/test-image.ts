import { createFalClient } from '@fal-ai/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    return res.status(500).json({ ok: false, stage: 'env', error: 'FAL_KEY is not set' });
  }

  const model = process.env.FAL_MODEL ?? 'fal-ai/flux/schnell';

  try {
    const fal = createFalClient({ credentials: falKey });

    const result = await fal.subscribe(model, {
      input: {
        prompt: 'a small red circle on a white background',
        image_size: 'square_hd',
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    });

    // Return the full raw result so we can see its exact shape
    return res.status(200).json({
      ok: true,
      model,
      result_keys: Object.keys(result ?? {}),
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return res.status(500).json({
      ok: false,
      stage: 'fal_call',
      model,
      error: message,
      stack,
    });
  }
}
