import type { ChatMessage } from '../types/chat';

export interface SendMessageOptions {
  messages: ChatMessage[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

// Demo responses for offline/no-key mode
const DEMO_RESPONSES = [
  `Sure! Here's a quick summary:\n\n**Key Points**\n- This is a demo response from AstraChat.\n- No real AI provider is configured yet.\n- To enable real AI, add your API key to the \`.env\` file.\n\nYou can still explore all the UI features in demo mode.`,
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

export async function sendMessage({
  messages,
  onChunk,
  signal,
}: SendMessageOptions): Promise<string> {
  const isDemoMode =
    !import.meta.env.VITE_OPENAI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY;

  let fullResponse = '';

  const handleChunk = (chunk: string) => {
    fullResponse += chunk;
    onChunk?.(chunk);
  };

  if (isDemoMode) {
    const demoText = nextDemoResponse();
    await streamDemoResponse(demoText, handleChunk, signal);
  } else {
    await sendToOpenAI(messages, handleChunk, signal);
  }

  return fullResponse;
}

export function isDemoMode(): boolean {
  return !import.meta.env.VITE_OPENAI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY;
}
