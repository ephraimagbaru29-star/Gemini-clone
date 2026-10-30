import type { Conversation, AppSettings } from '../types/chat';

const CONVERSATIONS_KEY = 'novachat_conversations';
const SETTINGS_KEY = 'novachat_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  saveHistory: true,
  demoMode: true,
  userName: 'Demo User',
  userEmail: 'demo@example.com',
  userAvatar: '',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: 'sample-1',
    title: 'Meaning of Flabbergasted',
    messages: [
      { id: 's1m1', role: 'user', content: 'What does flabbergasted mean?', createdAt: Date.now() - 86400000 * 2, status: 'complete' },
      { id: 's1m2', role: 'assistant', content: '**Flabbergasted** means utterly astonished or overwhelmed with surprise.\n\n*Example:* "She was absolutely flabbergasted when she won the award."\n\nIt\'s an informal word, perfect for expressing extreme, open-mouthed shock.', createdAt: Date.now() - 86400000 * 2 + 1000, status: 'complete' },
    ],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'sample-2',
    title: 'Explain quantum entanglement',
    messages: [
      { id: 's2m1', role: 'user', content: 'Can you explain quantum entanglement simply?', createdAt: Date.now() - 86400000 * 3, status: 'complete' },
      { id: 's2m2', role: 'assistant', content: 'Quantum entanglement is when two particles become linked so that measuring one instantly affects the other — no matter how far apart they are.\n\nThink of it like this: imagine two magic coins. Whenever you flip one and it lands heads, the other **always** lands tails — even if it\'s across the galaxy.', createdAt: Date.now() - 86400000 * 3 + 1000, status: 'complete' },
    ],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'sample-3',
    title: 'Python vs JavaScript comparison',
    messages: [
      { id: 's3m1', role: 'user', content: 'Python vs JavaScript — which should I learn first?', createdAt: Date.now() - 86400000 * 5, status: 'complete' },
      { id: 's3m2', role: 'assistant', content: 'Great question! It depends on your goal:\n\n**Python** — best for data science, AI/ML, scripting, and clean beginner syntax.\n\n**JavaScript** — essential for web development (front-end and back-end with Node.js).\n\n**Recommendation:** If you want to build websites, start with JavaScript. For everything else, Python is a fantastic first language.', createdAt: Date.now() - 86400000 * 5 + 1000, status: 'complete' },
    ],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'sample-4',
    title: 'Recipe for banana bread',
    messages: [
      { id: 's4m1', role: 'user', content: 'Give me a simple banana bread recipe', createdAt: Date.now() - 86400000 * 7, status: 'complete' },
      { id: 's4m2', role: 'assistant', content: '### Simple Banana Bread\n\n**Ingredients:**\n- 3 ripe bananas\n- 1/3 cup melted butter\n- 3/4 cup sugar\n- 1 egg\n- 1 tsp vanilla\n- 1 tsp baking soda\n- 1.5 cups flour\n\n**Steps:**\n1. Preheat oven to 175°C (350°F)\n2. Mash bananas, stir in butter\n3. Mix in sugar, egg, vanilla\n4. Add flour + baking soda\n5. Pour into loaf pan, bake 60 min', createdAt: Date.now() - 86400000 * 7 + 1000, status: 'complete' },
    ],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
];

export function loadConversations(): Conversation[] {
  const stored = safeGet<Conversation[]>(CONVERSATIONS_KEY, []);
  // Seed sample conversations on first load
  if (stored.length === 0) {
    safeSet(CONVERSATIONS_KEY, SAMPLE_CONVERSATIONS);
    return SAMPLE_CONVERSATIONS;
  }
  return stored;
}

export function saveConversations(convos: Conversation[]): void {
  safeSet(CONVERSATIONS_KEY, convos);
}

export function loadSettings(): AppSettings {
  const stored = safeGet<Partial<AppSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: AppSettings): void {
  safeSet(SETTINGS_KEY, settings);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(CONVERSATIONS_KEY);
  } catch {
    // ignore
  }
}
