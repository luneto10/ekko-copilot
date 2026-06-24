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
| `MEMORY_FLUSH_WORDS` | Words buffered before memory recompiles | `40` |
| `WORKIQ_MODE` | `mock` or `real` | `mock` |
| `WORKIQ_API_BASE` | Work IQ REST base (when `real`) | _(empty)_ |
| `WORKIQ_BEARER_TOKEN` | Work IQ bearer token (when `real`) | _(empty)_ |

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
