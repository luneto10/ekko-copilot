# ekko-sales-copilot
Real-time answers for customer-facing calls, grounded in your Microsoft 365 ecosystem.
# WorkIQ Sales Copilot

> An always-on-top, translucent floating desktop assistant for live Microsoft Teams
> sales calls. It transcribes both sides of the conversation with **Azure AI Speech**,
> maintains a rolling Markdown "memory" of the call with **Azure OpenAI**, and surfaces
> grounded enterprise answers (**Microsoft Work IQ** — mocked by default) plus real-time
> sales tactics.

**Status:** Proof of Concept (hackathon) · **Stack:** Electron 33 · TypeScript · React 18 · Vite 5 · Tailwind 3 · npm workspaces

For the full architecture see [`docs/DESIGN.md`](docs/DESIGN.md); for working in the UI see [`docs/FEATURE_GUIDE.md`](docs/FEATURE_GUIDE.md).

---

## Prerequisites

- **Node.js 20+** and npm 10+ (the project uses npm workspaces)
- **Windows** (audio loopback capture and the stop task are Windows-oriented)
- Optional, for real services: an **Azure AI Speech** resource and an **Azure OpenAI** deployment. The app runs fully with mocks if these are not configured.

---

## Quick start

```powershell
# 1. Install dependencies (root + all workspaces)
npm install

# 2. (Optional) Configure Azure + Work IQ — runs with mocks if skipped
copy .env.example .env
# then edit .env and fill in your keys

# 3. Start the app (Vite widget + Electron)
npm run dev
```

`npm run dev` starts the Vite renderer at `127.0.0.1:5173`, waits for it, then launches
the Electron main process. The floating widget appears always-on-top.

### Stop everything

```powershell
# Free port 5173 and kill the WorkIQ Electron processes
npm run dev   # press Ctrl+C in the terminal
```

…or use the **WorkIQ: Stop** VS Code task (see below), which also frees the port and
kills lingering Electron processes.

---

## Configuration

Copy [`.env.example`](.env.example) to `.env` (in the repo root or the
`apps/desktop-client/` folder) and fill in the values. These are read **only** by the
Electron main process and are never exposed to the renderer.

| Variable | Purpose | Default |
|---|---|---|
| `AZURE_SPEECH_KEY` | Azure AI Speech key (real-time STT) | _(empty → mock)_ |
| `AZURE_SPEECH_REGION` | Azure AI Speech region | `eastus` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | _(empty → mock)_ |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | _(empty → mock)_ |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name | `gpt-4o-mini` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-08-01-preview` |
| `MEMORY_FLUSH_WORDS` | Words buffered before memory recompiles | `25` |
| `WORKIQ_MODE` | `mock`, `real`, or `graph` (real Microsoft 365) | `mock` |
| `WORKIQ_API_BASE` | Work IQ REST base (when `real`) | _(empty)_ |
| `WORKIQ_BEARER_TOKEN` | Work IQ bearer token (when `real`) | _(empty)_ |
| `ENTRA_TENANT_ID` | Entra tenant (GUID/domain) for Graph (`graph` mode) | _(empty)_ |
| `ENTRA_CLIENT_ID` | Entra **public-client** app ID (`graph` mode) | _(empty)_ |
| `GRAPH_SCOPES` | Delegated Graph scopes | `Files.Read.All Sites.Read.All Mail.Read` |
| `GRAPH_ACCESS_TOKEN` | Pre-acquired Graph token (skips app registration) | _(empty)_ |

---

## Scripts

| Command | What it does |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start the widget (Vite) + Electron main process |
| `npm run build` | Build the widget (`vite build`) and main/preload (`tsup`) |
| `npm run typecheck` | `tsc --noEmit` for both apps |

> Renderer edits hot-reload. **Main-process edits require restarting** the dev task
> (`tsup` builds once at launch).

---

## VS Code tasks

Run from **Terminal → Run Task…** (group `workiq`):

- **WorkIQ: Install** — `npm install`
- **WorkIQ: Dev** — `npm run dev` (background; this is the default build task)
- **WorkIQ: Stop** — frees port 5173 and kills the WorkIQ Electron processes

---

## Project layout

```text
workiq-sales-copilot/
├── package.json            # workspaces + dev/build/typecheck scripts
├── .env.example            # Azure + Work IQ config template
├── .vscode/tasks.json      # Install / Dev / Stop tasks
├── docs/                   # DESIGN.md, FEATURE_GUIDE.md, backlog
├── packages/               # shared types + base tsconfig
└── apps/
    ├── desktop-client/     # Electron main (audio, Azure Speech, orchestrator)
    └── floating-widget/    # Electron renderer (React + Tailwind dashboard)
```

---

## Tech specs (deep dive)

This section explains how the copilot is built, the stack we chose, and **why** —
from raw microphone frames all the way to a grounded answer pulled from your real
Microsoft 365 content.

### Why Electron + a split process model

A live-call copilot has two hard requirements that the browser sandbox can't meet
on its own: it must **float above Microsoft Teams** (always-on-top, frameless,
click-through-friendly) and it must **capture system audio** (the customer's voice
coming out of your speakers), not just the microphone. Electron gives us native
window control and Node APIs while still letting us build the UI with web tech.

The app is deliberately split into two processes with a single typed seam between
them:

| Process | Workspace | Responsibilities |
|---|---|---|
| **Main** (Node) | `apps/desktop-client` | Window management, audio routing, Azure AI Speech, the orchestration pipeline, Microsoft Graph + Azure OpenAI calls. Holds **all secrets**. |
| **Renderer** (Chromium) | `apps/floating-widget` | React UI: live transcript, key-note pills, per-pill chat, Wolf Tactics. Captures audio in the browser layer and ships PCM to main. |

The processes never share objects — they talk over **typed IPC**. Channel names and
payload shapes are defined once in `packages/types` (the `IPC` enum + interfaces),
exposed through a `contextBridge` preload as `window.workiq`, and consumed in the
renderer via a thin `bridge`. This keeps the contract impossible to drift: a
channel rename is a compile error on both sides. API keys live only in the main
process and are **never** exposed to the renderer.

```text
 🎙 mic  ─┐                                   ┌─► Azure AI Speech (rep stream)
          ├─ AudioWorklet → 16-bit PCM ─IPC─►─┤
 🔊 sys  ─┘  (renderer, ~100 ms batches)       └─► Azure AI Speech (customer stream)
                                                          │ transcript segments
                                                          ▼
                                          RollingBuffer → Azure OpenAI (memory.md)
                                                          │
                                      key point? → Microsoft Graph search/retrieval
                                                          │  + Azure OpenAI synthesis
                                                          ▼
                                        IPC → renderer (pills, answers, tactics)
```

### Dual-source audio capture (microphone + system loopback)

Speaker attribution is the part most copilots get wrong with fuzzy
"diarization." We sidestep it entirely by capturing **two physically separate
streams**:

- **Microphone** (the sales rep) via `getUserMedia` with echo cancellation and
  noise suppression on.
- **System loopback** (the customer) via `getDisplayMedia({ audio: true })` — we
  immediately stop and discard the video track and keep only the audio tracks.

Because each source is its own stream, the speaker is known **deterministically**
by origin — no blind voice separation, no cross-talk guessing. Each stream runs
through an `AudioContext` fixed at **16 kHz mono** and an **AudioWorklet**
(`public/pcm-worklet.js`) that converts Float32 samples to **16-bit PCM** and
posts ~**100 ms batches** back to the main thread. Batching keeps IPC traffic low
and matches exactly the format Azure Speech wants, so no resampling happens later.
A muted gain node keeps the audio graph "pulling" frames without echoing the call
back to the speakers.

### Speech-to-text with Azure AI Speech

The main process runs **one continuous `SpeechRecognizer` per source**
(`SourceRecognizer`). Each recognizer is fed by a `PushAudioInputStream` declared
as `16 kHz / 16-bit / mono` — the PCM the worklet already produces. We use:

- **`recognizing`** events for low-latency **interim** text (streamed straight to
  the live feed so the rep sees words appear as they're spoken), and
- **`recognized`** events for **finalized** utterances (the units that drive
  memory and grounding).

Because each recognizer is bound to a single source, the `speaker` label is
attached for free. The recognizer also self-heals: transient network/DNS
cancellations trigger an **exponential-backoff reconnect** (capped at 15 s) that
swaps in a fresh stream so `write()` never targets a dead recognizer.

### Memory compaction (rolling Markdown CRM)

Feeding every line into the model would be slow, expensive, and noisy. Instead a
**`RollingBuffer`** accumulates finalized utterances and flushes only at a
**natural pause** — when the buffer crosses a word threshold
(`MEMORY_FLUSH_WORDS`, default 25) *and* a sentence has just finalized. On flush,
the labeled transcript block + the current note are sent to **Azure OpenAI**
(`MemoryCompiler.compile`), which returns an updated, deduplicated **`memory.md`**
organized into sections (Customer, Pain Points, Objections, Requirements, Next
Steps). This is *compaction*, not accumulation: the note is rewritten to stay
small and current, so the running context fed to every other prompt is a tight
summary rather than a growing transcript.

### Key-point detection → Microsoft Graph grounding (the M365 integration)

Every **customer** final line is passed (off the hot path) to an AI
**`KeyPointDetector`**: a `gpt-4o-mini` call that returns strict JSON deciding
whether the line is a groundable question/objection, and if so names a **specific
topic** (e.g. `"SOC 2"`, not `"Security"`) plus a search query. To avoid duplicate
pills, the detector is given the topics already on the board and instructed to
**reuse an existing label** when the point is about the same thing.

When a key point fires, the main process grounds it through **Microsoft Graph**
(`WORKIQ_MODE=graph`), against the rep's *real* Microsoft 365 content:

1. **Copilot Retrieval API** (`/beta/copilot/retrieval`) first — semantic
   retrieval over SharePoint/OneDrive that returns ranked extracts. This is the
   preferred path where a Microsoft 365 Copilot license is present.
2. **Graph Search API** (`/v1.0/search/query`) as a fallback for tenants without
   that license (the API returns `403`; we flip a flag and log it **once** per
   session, then use Search for the rest of the run). Because v1.0 rejects mixing
   entity types in one request, we query **`driveItem`** and **`message`**
   separately, merge, then **rank and trim**: dedupe by title, score by query-term
   overlap (title matches weighted heavily), prefer documents over email, and keep
   the top few. Verbose questions are turned into an **OR-joined** keyword query
   (stop-words stripped, terms ≥ 3 chars, via a shared `tokenize` helper) because
   Graph ANDs terms by default and over-specific queries return nothing.

The retrieved snippets are then synthesized by **Azure OpenAI**
(`answerFromSnippets`) into a **≤ 2-sentence**, customer-facing answer grounded
**only** in those snippets — with explicit instructions to de-escalate if the
customer is frustrated and to never invent facts. The result (answer + clickable
source documents) is sent to the renderer as a key-note pill.

**Auth:** Graph access uses delegated permissions via **MSAL** (`@azure/msal-node`)
with the **device-code flow** — on first run it prints a URL + code, you sign in
once, and the token is cached to `.msal-cache.json` (gitignored) so later runs are
silent. It requires an Entra **public-client** app with `Files.Read.All`,
`Sites.Read.All`, and `Mail.Read` consented. For quick tests you can paste a
pre-acquired token via `GRAPH_ACCESS_TOKEN` and skip the app registration entirely.

### Real-time sales tactics ("Wolf Tactics")

Coaching nudges are **event-driven**, not on a timer: a fresh `memory.md` (or a
newly grounded answer) triggers one `gpt-4o-mini` tactic. Crucially, the tactic
prompt is fed the **grounded facts** cached from Graph lookups and is forbidden
from inventing numbers — so it cites the real figure from your documents (e.g. the
actual per-seat price) instead of a plausible-sounding guess. When a lookup is
still in flight it coaches qualitatively, then refreshes once grounding lands.

### Graceful degradation (mocks everywhere)

Every external dependency is behind an interface with a mock, so the app runs with
**zero cloud config**: no Speech key → injected demo transcripts; no Azure OpenAI
→ memory/tactics no-op cleanly; `WORKIQ_MODE=mock` → a local mock client answers
key points. This keeps the demo reproducible and makes each integration swappable
(`Mock` / `Rest` / `Graph` clients all satisfy the same `WorkIqClient` contract).

### Stack at a glance — and why

| Layer | Choice | Why |
|---|---|---|
| Shell | **Electron 33** | Always-on-top frameless window + native system-audio capture above Teams. |
| Language | **TypeScript** (strict) | One language across both processes; the IPC contract is type-checked end to end. |
| UI | **React 18 + Vite 5** | Fast HMR for rapid hackathon iteration; component model fits the pill/chat layout. |
| Styling | **Tailwind 3** + CSS vars | Quick, consistent theming incl. the translucent "glass" surfaces. |
| Speech | **Azure AI Speech** | Streaming STT with interim results and a per-stream push-audio API — ideal for dual-source attribution. |
| Reasoning | **Azure OpenAI** (`gpt-4o-mini`) | Cheap/fast model for memory compaction, key-point detection, grounded answers, and tactics. |
| Grounding | **Microsoft Graph** (Retrieval + Search) | Answers from the rep's *real* M365 documents and mail, not a static corpus. |
| Auth | **MSAL** (device-code) | Simplest delegated-auth flow for a desktop app; cached to disk. |
| Main build | **tsup** (esbuild) | Near-instant CJS bundle of `main` + `preload` for Electron. |
| Monorepo | **npm workspaces** | Shared `@workiq/types` as the single source of truth for the IPC contract. |
