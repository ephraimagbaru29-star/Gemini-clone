import { createFalClient } from '@fal-ai/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FAL_MODEL = process.env.FAL_MODEL ?? 'fal-ai/flux/schnell';

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return res.status(500).json({ error: 'FAL_KEY is not configured on the server.' });
  }

  let body: { prompt?: string };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const safePrompt = prompt.trim().slice(0, 1000);

  try {
    // Create a fresh client per request with the server-side key
    const fal = createFalClient({ credentials: falKey });

    const result = await fal.subscribe(FAL_MODEL, {
      input: {
        prompt: safePrompt,
        image_size: 'landscape_4_3',
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    });

    // Log the raw result shape for debugging (visible in Vercel function logs)
    console.log('[api/image] result keys:', Object.keys(result ?? {}));

    // fal.subscribe returns the result directly — shape: { images: [...], ... }
    // Handle both possible shapes defensively
    const anyResult = result as Record<string, unknown>;
    const images = (
      Array.isArray(anyResult?.images) ? anyResult.images :
      Array.isArray((anyResult?.data as Record<string, unknown>)?.images)
        ? (anyResult.data as Record<string, unknown>).images :
      null
    ) as Array<{ url: string; width?: number; height?: number; content_type?: string }> | null;

    if (!images || images.length === 0) {
      console.error('[api/image] No images in result:', JSON.stringify(result));
      return res.status(500).json({
        error: 'No image returned by fal.ai. Try a different prompt.',
        debug_keys: Object.keys(anyResult ?? {}),
      });
    }

    const image = images[0];
    return res.status(200).json({
      imageUrl: image.url,
      mimeType: image.content_type ?? 'image/jpeg',
      width: image.width,
      height: image.height,
      prompt: safePrompt,
    });
  } catch (err) {
    // ApiError from @fal-ai/client has .status and .body, message may be empty
    const apiErr = err as { message?: string; status?: number; body?: unknown };
    const bodyStr = apiErr.body ? JSON.stringify(apiErr.body) : '';
    const message = apiErr.message || bodyStr || 'Unknown fal.ai error';
    console.error('[api/image] fal.ai error:', { message, status: apiErr.status, body: apiErr.body });

    const status =
      apiErr.status === 429 || message.includes('429') ? 429
      : apiErr.status === 401 || apiErr.status === 403 ? 401
      : apiErr.status === 422 || message.includes('safety') ? 422
      : 500;

    return res.status(status).json({ error: message, details: apiErr.body });
  }
}
