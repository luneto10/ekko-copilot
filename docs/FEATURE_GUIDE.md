# Floating Widget — Feature Guide

How to read, extend, and maintain the **renderer** (`apps/floating-widget`). The
UI is built as a **feature-modular template**: every panel is a small,
self-contained feature, and a single registry decides what shows and in what
order. You should rarely need to touch more than one folder to change something.

> For the system-wide design (Electron processes, Azure pipeline, IPC), see
> [`DESIGN.md`](./DESIGN.md). This guide is specifically about working in the UI.

---

## 1. Mental model

```
A "feature" = a folder under src/features/<name>/ that owns:
   • its data hook  (subscribes to the bridge, holds React state)   ← logic
   • its component  (renders that data, self-contained, no props)   ← view
   • an index.ts    (exports a PanelDefinition for the registry)    ← wiring

The layout (App.tsx) just renders whatever src/panels/registry.ts lists.
```

Principles this enforces:

| Principle | How the template applies it |
|---|---|
| **Single Responsibility** | Each feature owns *only* its own hook + component. No god-hook, no god-component. |
| **Open/Closed** | Add behaviour by adding a feature + registry entry — you don't edit `App.tsx`. |
| **DRY** | Shared `Panel`, `StatusPill`, `theme.ts` tokens, and one `bridge` facade — no copy-pasted Tailwind or `window.workiq`. |
| **Dependency Inversion** | Features import `@/shared/bridge`, never `window` directly (easy to mock/swap). |

---

## 2. Where everything lives

```
apps/floating-widget/src/
├── main.tsx                  # entry; routes ?view=debug → DevInspector, else App
├── App.tsx                   # LAYOUT shell: header + maps the panel registry
├── globals.css               # Tailwind + .prose-copilot / .tactic-md markdown styles
│
├── panels/
│   ├── types.ts              # PanelDefinition { id, Component, grow }
│   └── registry.ts           # ⭐ THE knob: which panels show + order
│
├── shared/                   # cross-feature building blocks (import via @/shared/…)
│   ├── bridge.ts             # `bridge` = typed window.workiq (single IPC entry point)
│   ├── workiq.d.ts           # the window.workiq contract (keep in sync w/ preload)
│   ├── theme.ts              # SPEAKER_COLOR / LABEL, SOURCE_ICON, GLASS_SURFACE
│   └── ui/
│       ├── Panel.tsx         # reusable titled glass panel
│       └── StatusPill.tsx    # reusable green/red status dot
│
└── features/                 # one folder per feature
    ├── capture/              # mic + system-loopback capture (header Start/Stop)
    │   └── useAudioCapture.ts
    ├── transcript/           # "Live Feed" panel
    │   ├── useTranscript.ts
    │   ├── LiveFeed.tsx
    │   └── index.ts          # → transcriptPanel
    ├── memory/               # "Call Intelligence" panel (memory.md)
    │   ├── useMemory.ts
    │   ├── CallIntelligence.tsx
    │   └── index.ts          # → memoryPanel
    ├── copilot/              # "Copilot · Work IQ" panel (Work IQ + Wolf Tactic)
    │   ├── useCopilot.ts
    │   ├── CopilotRecommendations.tsx
    │   └── index.ts          # → copilotPanel
    └── devtools/             # Dev Inspector (the ?view=debug window)
        └── DevInspector.tsx
```

The `@` alias → `src` (configured in `vite.config.ts` + `tsconfig.json`), so you
always import with stable paths like `@/shared/bridge`, never `../../../shared/…`.

---

## 3. What already ships

| Feature | Folder | Panel? | Reads from bridge | Purpose |
|---|---|---|---|---|
| Capture | `features/capture` | no (header) | sends `sendChunk` | Mic + loopback → PCM → main |
| Transcript | `features/transcript` | `transcriptPanel` | `onTranscript` | Live Feed by speaker |
| Memory | `features/memory` | `memoryPanel` | `onMemory` | Call Intelligence (memory.md) |
| Copilot | `features/copilot` | `copilotPanel` | `onWorkIqStatus/Result`, `onTactic` | Grounded answers + Wolf Tactic |
| Dev Tools | `features/devtools` | n/a (own window) | `onDebug*`, `send/forceX` | Inspector + transcript injector |

---

## 4. Step-by-step: **add a new feature/panel**

Say you want a **"Sentiment"** panel that shows live customer mood.

### Step 1 — (if it needs new data) add an IPC channel
Only needed when the main process must push new data. Four edits, in order:

1. `packages/types/src/index.ts` — add the channel + payload type:
   ```ts
   export interface SentimentUpdate { score: number; label: 'positive' | 'neutral' | 'negative'; }
   export const IPC = { /* … */ Sentiment: 'sentiment:update' } as const;
   ```
2. `apps/desktop-client/src/preload.ts` — expose a subscriber:
   ```ts
   onSentiment: (cb: (s: SentimentUpdate) => void) => subscribe(IPC.Sentiment, cb),
   ```
3. `apps/floating-widget/src/shared/workiq.d.ts` — add the method signature:
   ```ts
   onSentiment(cb: (s: SentimentUpdate) => void): () => void;
   ```
4. Emit it from the main process (e.g. the Orchestrator) via `this.emit(IPC.Sentiment, …)`.

> Pure-UI features (no new data) skip Step 1 entirely.

### Step 2 — create the feature folder
`src/features/sentiment/`:

**`useSentiment.ts`** (the logic — owns state, SRP):
```ts
import { useEffect, useState } from 'react';
import type { SentimentUpdate } from '@workiq/types';
import { bridge } from '@/shared/bridge';

export function useSentiment() {
  const [sentiment, setSentiment] = useState<SentimentUpdate | null>(null);
  useEffect(() => bridge.onSentiment(setSentiment), []);
  return sentiment;
}
```

**`Sentiment.tsx`** (the view — self-contained, no props, reuses `Panel`):
```tsx
import { Panel } from '@/shared/ui/Panel';
import { useSentiment } from './useSentiment';

export function Sentiment() {
  const sentiment = useSentiment();
  return (
    <Panel title="Customer Sentiment">
      {sentiment ? `${sentiment.label} (${sentiment.score})` : 'Listening…'}
    </Panel>
  );
}
```

**`index.ts`** (the wiring — export a `PanelDefinition`):
```ts
import type { PanelDefinition } from '@/panels/types';
import { Sentiment } from './Sentiment';

export const sentimentPanel: PanelDefinition = { id: 'sentiment', Component: Sentiment };
export { Sentiment } from './Sentiment';
export { useSentiment } from './useSentiment';
```

### Step 3 — register it
`src/panels/registry.ts` — add one line where you want it to appear:
```ts
import { sentimentPanel } from '@/features/sentiment';

export const PANELS: PanelDefinition[] = [
  transcriptPanel,
  sentimentPanel,   // ← shows between Live Feed and Call Intelligence
  memoryPanel,
  copilotPanel,
];
```

Done. `App.tsx` is untouched. Run `npm run typecheck` to confirm.

---

## 5. Step-by-step: **edit an existing feature**

- **Change what it shows** → edit that feature's `*.tsx` only.
- **Change what data it uses** → edit that feature's `use*.ts` hook only.
- **Change a colour / label / icon used across panels** → edit `src/shared/theme.ts` (one place).
- **Change the panel chrome (border, blur, title style) for all panels** → edit `src/shared/ui/Panel.tsx`.

Because each feature is isolated, you can change one without reading the others.

---

## 6. Step-by-step: **remove a feature**

1. Delete its entry from `src/panels/registry.ts`.
2. Delete its folder under `src/features/`.
3. If it owned an IPC channel nobody else uses, remove it from `@workiq/types`,
   `preload.ts`, and `bridge.d.ts`.

Nothing else references it, so there's nothing else to clean up.

---

## 7. Step-by-step: **change the layout / order**

Everything is driven by `src/panels/registry.ts`:

- **Reorder** → reorder the array.
- **Resize behaviour** → set `grow: true` on a `PanelDefinition` to make it fill
  available height (Live Feed, Call Intelligence). Omit `grow` to size-to-content
  (Copilot).
- **Header / outer shell / spacing** → edit `App.tsx` (the only layout file).

---

## 8. Conventions & gotchas

- **Never import `window.workiq` directly** — always `import { bridge } from '@/shared/bridge'`.
- **Subscriptions auto-clean up**: every `bridge.on*` returns an unsubscribe fn.
  In a hook do `useEffect(() => bridge.onX(cb), [])` (single sub) or collect
  several and `return () => offs.forEach(o => o())`.
- **Panels take no props** — they pull their own data via their hook. The layout
  must not thread state through.
- **Keep presentation in `theme.ts`**, not inline, when it's shared.
- **Main-process changes need a restart** (`WorkIQ: Stop` → `WorkIQ: Dev`); the
  renderer hot-reloads on its own.

---

## 9. Build & run

| Command (run in `workiq-sales-copilot/`) | What it does |
|---|---|
| `npm run dev` | Vite widget (5173) + Electron main + Dev Inspector |
| `npm run typecheck` | `tsc --noEmit` for both apps |
| `npm run build` | `vite build` (widget) + `tsup` (main) |

VS Code tasks: **WorkIQ: Install**, **WorkIQ: Dev**, **WorkIQ: Stop**.

Test a new panel fast: launch **WorkIQ: Dev**, open the Dev Inspector, and hit
**▶ Play sample call** to drive the whole pipeline without speaking.
