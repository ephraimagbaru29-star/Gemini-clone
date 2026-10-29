# AstraChat — Gemini-style AI Chat Demo

An independent, open-source AI chat web app inspired by conversational AI interfaces. Built with React, TypeScript, and Vite.

> **Not affiliated with Google.** This is a UI demo based on a public design reference.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:5173
```

The app runs in **demo mode** by default — no API key needed. Responses are pre-written but all UI interactions are fully functional.

---

## Connecting a real AI provider

```bash
cp .env.example .env
```

Edit `.env` and add your key:

```
VITE_OPENAI_API_KEY=sk-...
```

Restart the dev server. The app will stream real responses from OpenAI.

---

## Build for production

```bash
npm run build
# Output is in the dist/ folder
npm run preview   # preview the production build locally
```

---

## Architecture

```
src/
├── app/
│   └── App.tsx           # Root component — global state, routing
├── components/
│   ├── TopBar.tsx         # Header with menu, brand, new-chat, profile
│   ├── HistoryDrawer.tsx  # Left drawer — search, conversation list, profile
│   ├── ConversationView.tsx # Main chat surface
│   ├── WelcomeScreen.tsx  # Greeting + suggestion chips
│   ├── MessageList.tsx    # Scrollable message feed
│   ├── MessageBubble.tsx  # Individual user/assistant message
│   ├── Composer.tsx       # Text input + send/mic/attach
│   ├── AttachmentSheet.tsx# Bottom sheet for file/camera/image actions
│   ├── ProfileMenu.tsx    # Account popover
│   ├── SettingsDialog.tsx # Theme, history, account settings
│   ├── ConfirmDialog.tsx  # Reusable confirmation prompt
│   ├── Toast.tsx          # Transient notification banner
│   └── icons.tsx          # SVG icon components
├── lib/
│   ├── storage.ts         # localStorage persistence
│   ├── chatApi.ts         # AI provider abstraction + demo responder
│   ├── markdown.ts        # marked + DOMPurify rendering
│   └── dateFormat.ts      # Relative dates, conversation grouping
├── types/
│   └── chat.ts            # TypeScript interfaces
├── index.css              # All styles + CSS design tokens
└── main.tsx               # React entry point
```

---

## Features

- 🌑 Dark / light / system theme
- 📜 Persistent conversation history (localStorage)
- 🔍 Searchable history drawer with rename + delete
- 📎 File and image attachment (native browser APIs)
- 🎤 Voice input (Web Speech API, permission-gated)
- ✨ Streaming responses (real or demo)
- 📋 Copy response, regenerate last reply
- ♿ Accessible — ARIA labels, keyboard navigation, visible focus states
- 📱 Responsive — tested at 375 px, 390 px, 768 px, 1024 px, 1440 px

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_OPENAI_API_KEY` | OpenAI secret key |
| `VITE_OPENAI_MODEL` | Optional model override (default: `gpt-4o-mini`) |

---

## Known limitations

- Voice input requires browser support (Chrome/Edge) and HTTPS in production.
- Camera capture works on mobile browsers supporting `capture` attribute.
- Demo mode responses are illustrative — not real AI answers.
- No server-side component: API keys are exposed to the browser in dev mode. For production, proxy via a server route.

---

## Licence

MIT — do whatever you like with this code. Just don't claim it's an official Google product.
