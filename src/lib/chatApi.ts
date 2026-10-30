import type { ChatMessage } from '../types/chat';

export interface SendMessageOptions {
  messages: ChatMessage[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

// Demo responses for offline/no-key mode
const DEMO_RESPONSES = [
  `Sure! Here's a quick summary:\n\n**Key Points**\n- This is a demo response from Nova'sChat.\n- No real AI provider is configured yet.\n- To enable real AI, add your API key to the \`.env\` file.\n\nYou can still explore all the UI features in demo mode.`,
  `That's a great question! In demo mode, I return pre-written responses.\n\nTo get real answers:\n1. Copy \`.env.example\` to \`.env\`\n2. Add your \`VITE_OPENAI_API_KEY\` or \`VITE_GEMINI_API_KEY\`\n3. Restart the dev server\n\nI'll then use the actual model to respond.`,
  `Interesting! Let me think about that...\n\nIn a real setup I'd give you a thoughtful, context-aware response. For now, here's what I can tell you:\n\n> *"Demo mode is active. Responses are illustrative only."*\n\nFeel free to explore the drawer, attachments, settings, and theme switcher!`,
  `Here's a code example for context:\n\n\`\`\`typescript\ninterface Message {\n  role: 'user' | 'assistant';\n  content: string;\n}\n\nasync function chat(messages: Message[]) {\n  // Connect your AI provider here\n  return 'Hello from the assistant!';\n}\n\`\`\`\n\nThis is the pattern used in \`chatApi.ts\` — swap in your real provider endpoint.`,
  `I can help with that! Here are a few ideas:\n\n- **Option A** — Start simple and iterate\n- **Option B** — Plan thoroughly first\n- **Option C** — Prototype and get feedback early\n\nAll three are valid depending on your context. What matters most to you right now?`,
];

let demoIndex = 0;

function nextDemoResponse(): string {
  const response = DEMO_RESPONSES[demoIndex % DEMO_RESPONSES.length];
  demoIndex++;
  return response;
}

async function streamDemoResponse(
  text: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const words = text.split('');
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    onChunk(words[i]);
    if (i % 3 === 0) {
      await new Promise((r) => setTimeout(r, 12));
    }
  }
}

// Real API path — reads from environment variables
async function sendToOpenAI(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) throw new Error('No API key configured');

  const payload = {
    model: (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? 'gpt-4o-mini',
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: 1024,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
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
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

// ─── Gemini API (Google AI Studio) ──────────────────────────────────────────
async function sendToGemini(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('No Gemini API key configured');

  const model =
    (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() ||
    'gemini-3.8-flash';

  // Convert chat messages to Gemini format
  // Gemini uses "user"/"model" roles and a "parts" array
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload: Record<string, unknown> = { contents };

  // Gemini handles system instructions separately
  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      parts: [{ text: systemMessages.map((m) => m.content).join('\n') }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
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
      } catch {
        // skip malformed lines
      }
    }
  }
}

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

  const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY?.trim();
  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const isDemo = !hasOpenAIKey && !hasGeminiKey;

  if (isDemo) {
    const demoText = nextDemoResponse();
    await streamDemoResponse(demoText, handleChunk, signal);
  } else {
    // Pick the provider: prefer Gemini if its key is set, else OpenAI
    const useGemini = hasGeminiKey;
    try {
      if (useGemini) {
        await sendToGemini(messages, handleChunk, signal);
      } else {
        await sendToOpenAI(messages, handleChunk, signal);
      }
    } catch (err) {
      // Let real errors surface — don't silently fall back to demo mode
      if ((err as Error).name === 'AbortError') throw err;
      console.error('AI provider error:', err);
      throw err;
    }
  }

  return fullResponse;
}

export function isDemoMode(): boolean {
  const hasOpenAIKey = !!import.meta.env.VITE_OPENAI_API_KEY?.trim();
  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY?.trim();
  return !hasOpenAIKey && !hasGeminiKey;
}
