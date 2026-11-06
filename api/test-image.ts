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
      },
      logs: false,
    });

    return res.status(200).json({
      ok: true,
      model,
      result_keys: Object.keys(result ?? {}),
      result,
    });
  } catch (err) {
    // Extract ALL fields from ApiError — message may be empty but body has details
    const apiErr = err as { message?: string; status?: number; body?: unknown; stack?: string };
    const message = apiErr.message || '(empty message)';
    const status = apiErr.status;
    const body = apiErr.body;

    console.error('[test-image] ApiError:', { message, status, body });

    return res.status(500).json({
      ok: false,
      stage: 'fal_call',
      model,
      error: message,
      http_status: status,
      error_body: body,   // ← this is the real error from fal.ai
      stack: apiErr.stack,
    });
  }
}
