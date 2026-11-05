import type { ChatMessage } from '../types/chat';

export interface SendMessageOptions {
  messages: ChatMessage[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

// ─── Demo fallback responses ──────────────────────────────────────────────────
const DEMO_RESPONSES = [
  `Sure! Here's a quick summary:\n\n**Key Points**\n- No AI provider is configured yet.\n- To enable real AI, add your \`GROQ_API_KEY\` to Vercel environment variables.\n\nYou can still explore all the UI features in the meantime.`,
  `That's a great question! To get real answers, add \`GROQ_API_KEY\` to your Vercel project's environment variables and redeploy.`,
  `Interesting! In a real setup I'd give you a thoughtful, context-aware response powered by Groq's LLaMA model.\n\nFeel free to explore the drawer, attachments, settings, and theme switcher!`,
  `Here's a code example:\n\n\`\`\`typescript\ninterface Message {\n  role: 'user' | 'assistant';\n  content: string;\n}\n\nasync function chat(messages: Message[]) {\n  const res = await fetch('/api/chat', {\n    method: 'POST',\n    body: JSON.stringify({ messages }),\n  });\n}\n\`\`\`\n\nThis is how Nova'sChat sends messages to Groq via a secure server route.`,
  `I can help with that! Here are a few ideas:\n\n- **Option A** — Start simple and iterate\n- **Option B** — Plan thoroughly first\n- **Option C** — Prototype and get feedback early\n\nAll three are valid. What matters most to you right now?`,
];

let demoIndex = 0;
function nextDemoResponse(): string {
  const r = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return r;
}

async function streamDemoResponse(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    if (signal?.aborted) return;
    onChunk(text[i]);
    if (i % 3 === 0) await new Promise((r) => setTimeout(r, 12));
  }
}

// ─── Provider detection ───────────────────────────────────────────────────────
function hasGeminiKey(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY?.trim();
}

function hasOpenAIKey(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY?.trim();
}

export function isDemoMode(): boolean {
  return !hasGeminiKey() && !hasOpenAIKey();
  // Note: Groq via /api/chat is always tried first; isDemoMode only applies
  // when no client-side key exists AND /api/chat also fails.
}

// ─── /api/chat — Groq streaming via server route ──────────────────────────────
async function sendToGroqServer(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const payload = {
    messages: messages
      .filter((m) => m.role !== 'system' || m.content.trim())
      .map((m) => ({ role: m.role, content: m.content })),
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    // Try to parse error JSON
    try {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? `Server error ${res.status}`);
    } catch {
      throw new Error(`Server error ${res.status}`);
    }
  }

  // Parse SSE stream
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body from server');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6)) as { content?: string; error?: string };
          if (json.error) throw new Error(json.error);
          if (json.content) onChunk(json.content);
        } catch (parseErr) {
          if ((parseErr as Error).message && !(parseErr as Error).message.includes('JSON')) {
            throw parseErr;
          }
        }
      }
    }
  }
}

// ─── Gemini streaming fallback ────────────────────────────────────────────────
async function sendToGeminiOnce(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  model: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<void> {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload: Record<string, unknown> = { contents };
  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      parts: [{ text: systemMessages.map((m) => m.content).join('\n') }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body from Gemini');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onChunk(text);
      } catch { /* skip malformed */ }
    }
  }
}

const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];

async function sendToGemini(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('No Gemini API key configured');

  const primaryModel = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-3.8-flash';
  const modelsToTry = [primaryModel, ...GEMINI_FALLBACK_MODELS];
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1500;
  let lastError: Error = new Error('Unknown error');

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await sendToGeminiOnce(messages, onChunk, model, apiKey, signal);
        return;
      } catch (err) {
        if (signal?.aborted) throw err;
        lastError = err as Error;
        const is503 = lastError.message.includes('503') || lastError.message.toLowerCase().includes('unavailable');
        const is429 = lastError.message.includes('429') || lastError.message.toLowerCase().includes('rate limit');
        if ((is503 || is429) && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
        if (is503 || is429) break;
        throw err;
      }
    }
  }

  throw new Error(`Gemini is temporarily unavailable. Last error: ${lastError.message}`);
}

// ─── OpenAI fallback ──────────────────────────────────────────────────────────
async function sendToOpenAI(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('No OpenAI API key configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? 'gpt-4o-mini',
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* skip */ }
      }
    }
  }
}

// ─── Main sendMessage — provider priority: Groq > Gemini > OpenAI > Demo ──────
export async function sendMessage({
  messages,
  onChunk,
  signal,
}: SendMessageOptions): Promise<string> {
  let fullResponse = '';
  const handleChunk = (chunk: string) => {
    fullResponse += chunk;
    onChunk?.(chunk);
  };

  // 1. Try Groq via server route (GROQ_API_KEY is server-side only)
  try {
    await sendToGroqServer(messages, handleChunk, signal);
    return fullResponse;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;

    const msg = (err as Error).message ?? '';
    // If it's a real API error (not a 404 meaning "route doesn't exist"),
    // surface it to the user rather than silently falling back
    const isConfigError = msg.includes('GROQ_API_KEY is not configured');
    const isRouteNotFound = msg.includes('Server error 404') || msg.includes('Server error 405');

    if (!isConfigError && !isRouteNotFound) {
      // Real Groq error — surface it
      console.error('[chatApi] Groq error:', msg);
      throw err;
    }

    // Route doesn't exist or key not configured — fall through to next provider
    console.warn('[chatApi] Groq server route unavailable, falling back. Reason:', msg);
  }

  // 2. Try Gemini (client-side key)
  if (hasGeminiKey()) {
    try {
      await sendToGemini(messages, handleChunk, signal);
      return fullResponse;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.error('[chatApi] Gemini error:', (err as Error).message);
      throw err;
    }
  }

  // 3. Try OpenAI (client-side key)
  if (hasOpenAIKey()) {
    try {
      await sendToOpenAI(messages, handleChunk, signal);
      return fullResponse;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.error('[chatApi] OpenAI error:', (err as Error).message);
      throw err;
    }
  }

  // 4. Demo mode — no keys configured at all
  const demoText = nextDemoResponse();
  await streamDemoResponse(demoText, handleChunk, signal);
  return fullResponse;
}

// ─── Image generation ─────────────────────────────────────────────────────────
export interface GenerateImageResult {
  imageUrl: string;
  mimeType: string;
  prompt?: string;
}

// Route image generation to /api/image (fal.ai, server-side FAL_KEY)
// Falls back to Gemini image model if server route is unavailable
export async function generateImage(prompt: string): Promise<GenerateImageResult> {
  // 1. Try fal.ai via server route
  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (res.ok) {
      const data = await res.json() as GenerateImageResult;
      return data;
    }

    // Parse error
    const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` })) as { error?: string };
    const errMsg = errData.error ?? `Server error ${res.status}`;

    // Safety/content policy violation — don't fall back, surface immediately
    if (res.status === 422) throw new Error(`Content policy violation: ${errMsg}`);

    // FAL_KEY not configured — fall through to Gemini
    if (res.status === 500 && errMsg.includes('FAL_KEY')) {
      console.warn('[chatApi] FAL_KEY not configured, falling back to Gemini images');
    } else {
      throw new Error(errMsg);
    }
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // If route 404s (local dev), fall through. Otherwise rethrow.
    if (!msg.includes('Server error 404') && !msg.includes('FAL_KEY')) {
      throw err;
    }
  }

  // 2. Fallback — Gemini image generation (client-side key)
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    throw new Error('Image generation is not configured. Add FAL_KEY to your Vercel environment variables.');
  }

  const model = 'gemini-3.1-flash-image';
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
    json.candidates?.[0]?.content?.parts ?? [];

  const imagePart = parts.find((p) => p.inlineData);
  if (!imagePart?.inlineData) {
    throw new Error('No image returned. Try a more descriptive prompt.');
  }

  const { mimeType, data } = imagePart.inlineData;
  return { imageUrl: `data:${mimeType};base64,${data}`, mimeType, prompt };
}

// ─── Intent detection ─────────────────────────────────────────────────────────
export function isImageRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const triggers = [
    'generate an image',
    'generate image',
    'create an image',
    'create image',
    'draw me',
    'draw a',
    'draw an',
    'illustrate',
    'make an image',
    'make a picture',
    'make me an image',
    'show me an image',
    'paint',
    'sketch',
    'render an image',
    'produce an image',
    'generate a picture',
    'create a picture',
    'design an image',
    'visualize',
    'photo of',
    'image of',
    'picture of',
  ];
  return triggers.some((t) => lower.includes(t));
}
