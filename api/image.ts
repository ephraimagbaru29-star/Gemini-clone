import * as fal from '@fal-ai/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// fal.ai model — fast, high quality, good free tier
const FAL_MODEL = process.env.FAL_MODEL ?? 'fal-ai/flux/schnell';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return res.status(500).json({ error: 'FAL_KEY is not configured on the server.' });
  }

  const { prompt } = req.body as { prompt?: string };

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const safePrompt = prompt.trim().slice(0, 1000);

  try {
    // Configure fal.ai with the server-side key
    fal.config({ credentials: falKey });

    const result = await fal.subscribe(FAL_MODEL, {
      input: {
        prompt: safePrompt,
        image_size: 'landscape_4_3',
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    }) as {
      images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
    };

    const images = result?.images;
    if (!images || images.length === 0) {
      return res.status(500).json({ error: 'No image returned by fal.ai. Try a different prompt.' });
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/image] fal.ai error:', message);

    const status = message.includes('rate limit') || message.includes('429') ? 429
      : message.includes('401') || message.includes('403') ? 401
      : message.includes('safety') || message.includes('content policy') ? 422
      : 500;

    return res.status(status).json({ error: message });
  }
}
