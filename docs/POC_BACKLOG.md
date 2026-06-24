# WorkIQ Sales Copilot — PoC Product Backlog & Sprint Plan

> **Role:** Scrum Master deliverable · **Doc type:** Product Backlog + Release Plan
> **Product:** WorkIQ Sales Copilot — an always-on-top floating desktop assistant for live Teams sales calls.
> **Goal of this doc:** A complete, build-ready backlog from foundation to demo, broken into Epics → User Stories → Tasks with acceptance criteria, estimates, priorities, and a sprint plan. A companion `backlog-import.csv` lets you load it into a free Scrum tool (Jira / Azure DevOps / Taiga / Trello).

---

## 1. How to use this document

- **Epics** = large bodies of work (a feature area). **User Stories** = user-valuable increments with acceptance criteria. **Tasks** = the technical to-dos inside a story.
- Each story has: a **role/goal/benefit** statement, **MoSCoW priority**, **story points**, **target sprint**, **dependencies**, **acceptance criteria (AC)**, and **tasks**.
- The **Backlog Summary** (§9) is the single source of truth for points/sprint/priority and mirrors `backlog-import.csv`.
- To put this on a board, jump to **§12 Importing into a free Scrum tool**.

---

## 2. Current status snapshot (starting point)

The PoC is **partially scaffolded** already — this backlog covers the whole journey but marks what's done so the team starts from reality, not zero.

| Area | Status |
|---|---|
| Monorepo (npm workspaces), shared types/config | **Done** |
| Electron main + preload (tsup), Vite/React/Tailwind widget | **Done** |
| Audio capture (mic + system loopback) + PCM worklet | **Done** |
| Real-time transcription (Azure Speech, dual recognizers) | **Done** |
| Memory note + tactics (Azure OpenAI) | **Done** |
| Intent detection + Work IQ **mock** client | **Done** |
| Dev Inspector window | **Done** |
| **Azure infra**: Speech (S0) + OpenAI `gpt-4.1-mini` provisioned, `.env` wired, budget alert | **Done** |
| **Work IQ → real knowledge (Azure AI Search RAG)** | **Not started ← primary remaining work** |
| Hardening, packaging, demo readiness, docs | **Partially** |

> **Implication:** Sprints 1–2 below are largely **verification/hardening** of existing code; the **net-new build effort concentrates in Epic 8 (RAG)** and Epics 9–11 (observability, security, demo). Teams starting fresh can treat Sprints 1–2 as full build.

---

## 3. Product vision & PoC success criteria

**Vision:** Give a sales rep a silent co-pilot during a live Teams call that (a) transcribes both sides, (b) maintains a running CRM-style note, (c) surfaces real-time tactics, and (d) answers customer questions grounded in company knowledge with citations.

**PoC is "successful" when, in a scripted 10-minute demo call:**
1. Both speakers are transcribed live with correct attribution (Rep vs Customer).
2. A running memory note visibly updates at natural pauses.
3. At least one next-move **tactic** appears during the call.
4. A customer question (e.g., pricing/security) triggers a **grounded answer with at least one real citation** from the knowledge base.
5. The overlay stays on top of a full-screen Teams call and never blocks the rep.
6. No secrets leak to the renderer; the app runs (degraded) even if a key is missing.

**Out of scope for the PoC:** production auth (Entra), multi-tenant, CRM write-back, packaging for store distribution, non-English locales, persistent storage of calls.

---

## 4. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Riya — Sales Rep (primary)** | Runs Teams sales calls; non-technical | Hands-free help, no UI fiddling, trustworthy answers with sources |
| **Marco — Sales Manager** | Coaches reps, cares about consistency | Reps stay on-message; objections handled with approved content |
| **Dev — Engineer** | Builds & demos the PoC | Fast local loop, observability, easy config |
| **Priya — Demo Presenter** | Shows the PoC to stakeholders | Reliable, repeatable demo; graceful failure |

---

## 5. Team & roles (suggested)

| Role | Responsibility |
|---|---|
| Product Owner | Prioritizes backlog, accepts stories, owns demo narrative |
| Scrum Master | Facilitates ceremonies, removes blockers, guards WIP/DoD |
| Dev — Desktop/Electron | Main process, IPC, audio, packaging |
| Dev — Frontend | Widget UI/UX, animations, panels |
| Dev — AI/Cloud | Azure Speech/OpenAI/AI Search, RAG pipeline, prompts |
| QA / Demo | Smoke tests, demo script, eval of grounding quality |

> A 2–3 person team can cover all roles; assignments are hats, not headcount.

---

## 6. Agile process

- **Cadence:** 4 sprints. Default **1 week/sprint** for a hackathon pace (or 2 weeks for a relaxed PoC).
- **Ceremonies:** Sprint Planning (start), Daily Stand-up (15 min), Backlog Refinement (mid-sprint, 30 min), Sprint Review/Demo (end), Retrospective (end).
- **WIP limit:** ≤ 2 in-progress stories per developer.

### Estimation legend (Fibonacci, relative)
| Points | Meaning |
|---|---|
| 1 | Trivial (< 2h) |
| 2 | Small (~half day) |
| 3 | Medium (~1 day) |
| 5 | Large (2–3 days) |
| 8 | Very large / spike (4–5 days) — consider splitting |
| 13 | Too big — **must** split before pulling in |

### MoSCoW priority
- **Must** = PoC fails without it · **Should** = important, not fatal · **Could** = nice-to-have · **Won't (now)** = explicitly deferred.

### Definition of Ready (DoR) — a story may enter a sprint when:
- It has a clear role/goal/benefit, testable AC, an estimate, and no unresolved external blocker.

### Definition of Done (DoD) — a story is done when:
- Code merged to `main`; `npm run typecheck` and `npm run build` pass; manual AC verified; no secrets committed; brief note/demo step added where relevant.

---

## 7. Release / sprint plan overview

| Sprint | Theme | Epics | Goal |
|---|---|---|---|
| **Sprint 1** | Foundation & capture | E1, E2, E3 | Live, attributed transcription end-to-end |
| **Sprint 2** | Intelligence & UI | E4, E5, E6 | Memory note + tactics visible in a polished overlay |
| **Sprint 3** | Knowledge grounding | E7, **E8** | Real answers with citations from the knowledge base (RAG) |
| **Sprint 4** | Harden & demo | E9, E10, E11 | Observable, secure, packaged, demo-ready |

---

## 8. Epics & user stories

Legend for each story header: `[Priority · Points · Sprint]`. Status shown only when not "To Do".

---

### EPIC 1 — Project Foundation & Tooling
*Goal: a reproducible monorepo and dev loop so the team can build fast.*

#### US-1.1 — Monorepo scaffold `[Must · 3 · S1]` — **Done**
- **As a** developer, **I want** an npm-workspaces monorepo (apps + packages), **so that** code is shared and built consistently.
- **AC:** `npm install` bootstraps all workspaces; `apps/*` and `packages/*` resolve via workspace links; root scripts orchestrate sub-packages.
- **Tasks:** root `package.json` workspaces; folder structure; `.gitignore`; baseline README.

#### US-1.2 — Shared types package `[Must · 2 · S1]` — **Done**
- **As a** developer, **I want** a `@workiq/types` package with shared interfaces + IPC channel constants, **so that** main and renderer never drift.
- **AC:** Both apps import `@workiq/types`; bundlers inline it; changing a type surfaces compile errors on both sides.
- **Tasks:** define `TranscriptSegment`, `WorkIqResponse`, `IPC` map; configure `noExternal` in tsup.

#### US-1.3 — Shared TS config `[Should · 1 · S1]` — **Done**
- **As a** developer, **I want** a strict shared `tsconfig.base.json`, **so that** all packages share compiler rules.
- **AC:** `strict: true`, `moduleResolution: Bundler`; packages `extends` the base.
- **Tasks:** `@workiq/config` package; wire `extends` in each tsconfig.

#### US-1.4 — Electron main + preload build `[Must · 3 · S1]` — **Done**
- **As a** developer, **I want** tsup to compile main + preload to CJS, **so that** Electron loads them reliably.
- **AC:** `dist/main.js` + `dist/preload.js` produced; preload exposes a typed, minimal API.
- **Tasks:** `tsup.config.ts`; preload `contextBridge` surface; main entry.

#### US-1.5 — Widget app (Vite + React + Tailwind) `[Must · 3 · S1]` — **Done**
- **As a** developer, **I want** a Vite/React/Tailwind renderer on port 5173, **so that** UI iterates with HMR.
- **AC:** `npm run dev:widget` serves on `127.0.0.1:5173`; Tailwind utilities apply.
- **Tasks:** Vite config (host `127.0.0.1`); Tailwind v3 setup; base `App.tsx`.

#### US-1.6 — Dev orchestration `[Must · 2 · S1]` — **Done**
- **As a** developer, **I want** one command to run widget + Electron together, **so that** the loop is one step.
- **AC:** `npm run dev` starts Vite, waits for 5173, builds, launches Electron; VS Code tasks mirror this.
- **Tasks:** `concurrently` + `wait-on`; `.vscode/tasks.json` (Install/Dev/Stop).

#### US-1.7 — Quality gates & CI `[Should · 3 · S1]`
- **As a** developer, **I want** lint/format/typecheck and a CI check, **so that** regressions are caught early.
- **AC:** `npm run typecheck` and `npm run build` run in CI on PRs; formatting enforced.
- **Tasks:** ESLint + Prettier config; `typecheck` script; GitHub Actions workflow.

---

### EPIC 2 — Audio Capture & Streaming
*Goal: capture both audio sources and stream clean PCM to the main process.*

#### US-2.1 — Microphone capture `[Must · 3 · S1]` — **Done**
- **As a** rep, **I want** the app to capture my mic when I click Start, **so that** my speech is transcribed.
- **AC:** `getUserMedia` runs on a user gesture; capture stops cleanly; permission denial handled.
- **Tasks:** `useAudioCapture` mic branch; Start/Stop wiring; error toast.

#### US-2.2 — System loopback capture `[Must · 5 · S1]` — **Done**
- **As a** rep, **I want** the app to capture the remote participant's audio, **so that** the customer is transcribed.
- **AC:** `getDisplayMedia` with `audio: 'loopback'` captures system output without a picker; main grants via `setDisplayMediaRequestHandler`.
- **Tasks:** main permission handler; renderer loopback stream; fallback if unavailable.

#### US-2.3 — PCM downsample worklet `[Must · 5 · S1]` — **Done**
- **As a** developer, **I want** an AudioWorklet that emits 16 kHz/16-bit/mono PCM in ~100 ms batches, **so that** Azure Speech gets the format it needs.
- **AC:** `AudioContext({sampleRate:16000})` → worklet emits Int16 batches; both sources use it.
- **Tasks:** `public/pcm-worklet.js`; Float32→Int16 conversion; batching.

#### US-2.4 — Stream PCM renderer → main `[Must · 3 · S1]` — **Done**
- **As a** developer, **I want** audio chunks sent over IPC to main, **so that** transcription runs out of the renderer.
- **AC:** `window.workiq.sendChunk` → `audio:chunk` IPC; payload tags `source` (mic/system).
- **Tasks:** preload callback; IPC channel; `AudioChunkPayload` type; main router.

#### US-2.5 — Capture controls & permission UX `[Should · 2 · S2]`
- **As a** rep, **I want** clear Start/Stop and permission feedback, **so that** I know it's listening.
- **AC:** Button reflects state; denied permissions show actionable guidance.
- **Tasks:** Start/Stop component; state machine; denied-permission help text.

---

### EPIC 3 — Real-Time Transcription (Azure Speech)
*Goal: accurate, attributed, low-latency transcripts.*

#### US-3.1 — Speech resource & config `[Must · 2 · S1]` — **Done**
- **As a** developer, **I want** Azure Speech provisioned and configured via env, **so that** STT works.
- **AC:** `AZURE_SPEECH_KEY/REGION` read by main only; S0 tier (supports 2 concurrent streams).
- **Tasks:** provision (done: `speech-workiq-c1s258`, eastus, S0); `.env` keys; config loader.

#### US-3.2 — Continuous source recognizer `[Must · 5 · S1]` — **Done**
- **As a** developer, **I want** one continuous `SpeechRecognizer` per source, **so that** each stream transcribes independently.
- **AC:** push-stream feeds PCM; interim + final events emitted; cancellation logged.
- **Tasks:** `SourceRecognizer`; push-stream wiring; lifecycle close.

#### US-3.3 — Source-based speaker attribution `[Must · 3 · S1]` — **Done**
- **As a** rep, **I want** my words labeled "Sales Rep" and the customer's "Customer", **so that** the transcript is readable.
- **AC:** mic → `Speaker_1`/Sales Rep; system → `Speaker_2`/Customer; deterministic (no diarization).
- **Tasks:** map source→speaker; label propagation to UI.

#### US-3.4 — Interim + final streaming to UI `[Should · 3 · S2]` — **Done**
- **As a** rep, **I want** to see words as they're spoken, **so that** it feels live.
- **AC:** interim segments render greyed; finals solidify; throttled for readability.
- **Tasks:** `transcript:segment` channel; live-feed render; interim styling.

#### US-3.5 — Graceful degradation `[Must · 2 · S2]` — **Done**
- **As a** developer, **I want** the app to run if Speech isn't configured, **so that** the UI still demos.
- **AC:** missing key → warning log + transcription disabled; no crash.
- **Tasks:** `isSpeechConfigured()`; guarded start; warning surface.

---

### EPIC 4 — Conversation Memory / CRM Note (Azure OpenAI)
*Goal: a living markdown note compiled from the conversation.*

#### US-4.1 — Rolling buffer with flush threshold `[Must · 3 · S2]` — **Done**
- **As a** developer, **I want** a buffer that flushes at a word threshold on a natural pause, **so that** compilation happens at sensible moments.
- **AC:** finals accumulate; flush at > 150 words and not already compiling.
- **Tasks:** `RollingBuffer` (add/wordCount/flush); flush guard.

#### US-4.2 — Memory compiler (Azure OpenAI) `[Must · 5 · S2]` — **Done**
- **As a** rep, **I want** the note merged/updated from new transcript blocks, **so that** it stays current.
- **AC:** `gpt-4.1-mini` merges existing note + new block → full updated markdown; failures don't crash.
- **Tasks:** `MemoryCompiler.compile`; `AzureOpenAI` client; `MEMORY_SYSTEM` prompt.

#### US-4.3 — Memory render in UI `[Should · 3 · S2]` — **Done**
- **As a** rep, **I want** the note shown as formatted markdown, **so that** I can glance at key facts.
- **AC:** `memory:update` pushes markdown; rendered with react-markdown; updates without flicker.
- **Tasks:** memory panel; markdown renderer; updatedAt indicator.

#### US-4.4 — CRM-note prompt engineering `[Should · 3 · S2]`
- **As a** manager, **I want** the note structured (needs, objections, next steps), **so that** it's useful post-call.
- **AC:** prompt yields consistent sections; resists hallucinating facts not in transcript.
- **Tasks:** iterate `MEMORY_SYSTEM`; few-shot; eval on 3 sample transcripts.

#### US-4.5 — Degrade when OpenAI absent `[Must · 1 · S2]` — **Done**
- **As a** developer, **I want** memory to no-op without OpenAI config, **so that** the UI still runs.
- **AC:** `isOpenAiConfigured()` false → returns current note unchanged; warning logged.
- **Tasks:** guard in compiler; warning surface.

---

### EPIC 5 — Real-Time Sales Tactics (Azure OpenAI)
*Goal: timely next-move suggestions.*

#### US-5.1 — Tactic timer & context window `[Must · 3 · S2]` — **Done**
- **As a** rep, **I want** a tactic every ~60s based on recent exchanges, **so that** I get nudges without spam.
- **AC:** 60s interval; uses last ~8 exchanges + memory; skips when no history.
- **Tasks:** interval timer; recent-exchange selector; trigger.

#### US-5.2 — Tactic generation prompt `[Should · 3 · S2]`
- **As a** rep, **I want** one concise, actionable next move, **so that** I can act mid-call.
- **AC:** ≤ 1 short suggestion; ≤ 120 tokens; never invents pricing/policy.
- **Tasks:** `TACTIC_SYSTEM` prompt; temperature tuning; guardrails.

#### US-5.3 — Tactic card UI `[Should · 2 · S2]` — **Done**
- **As a** rep, **I want** tactics shown as dismissible cards, **so that** they're noticeable but not blocking.
- **AC:** `copilot:tactic` renders a card; animates in; auto-ages out.
- **Tasks:** tactic card; framer-motion; throttle/dedup.

---

### EPIC 6 — Floating Widget UI/UX
*Goal: an always-on-top overlay that's glanceable and unobtrusive.*

#### US-6.1 — Always-on-top frameless overlay `[Must · 5 · S2]` — **Done**
- **As a** rep, **I want** a transparent, frameless window above full-screen Teams, **so that** it's always visible.
- **AC:** `alwaysOnTop('screen-saver')`, `visibleOnAllWorkspaces`, transparent bg; stays above a full-screen call.
- **Tasks:** BrowserWindow config; transparency; z-order flags.

#### US-6.2 — Live transcript feed `[Must · 3 · S2]` — **Done**
- **As a** rep, **I want** a scrolling feed of attributed lines, **so that** I can follow the conversation.
- **AC:** auto-scroll; Rep/Customer styled distinctly; interim vs final visually different.
- **Tasks:** `LiveFeed` component; auto-scroll; speaker styling.

#### US-6.3 — Copilot recommendations panel `[Must · 3 · S2]` — **Done**
- **As a** rep, **I want** tactics + Work IQ answers in one panel, **so that** guidance is centralized.
- **AC:** shows tactic cards and grounded answers with citations; loading states visible.
- **Tasks:** `CopilotRecommendations`; result + tactic merge; spinner.

#### US-6.4 — Call intelligence / memory panel `[Should · 3 · S2]` — **Done**
- **As a** rep, **I want** the CRM note visible in a tab/panel, **so that** I can reference it.
- **AC:** markdown note; updatedAt; collapsible.
- **Tasks:** `CallIntelligence` panel; tab switching.

#### US-6.5 — Move / resize / collapse `[Should · 3 · S3]`
- **As a** rep, **I want** to drag, resize, and collapse the widget, **so that** it fits my screen.
- **AC:** draggable region; min sizes enforced; collapse to compact bar.
- **Tasks:** CSS `-webkit-app-region`; resize handles; collapse state.

#### US-6.6 — Visual states & motion `[Could · 2 · S3]`
- **As a** rep, **I want** clear listening/searching/idle states, **so that** I trust what it's doing.
- **AC:** distinct visuals per state; subtle animation; "searching Work IQ" indicator.
- **Tasks:** state-driven styles; framer-motion transitions.

---

### EPIC 7 — Intent Detection & Work IQ Grounding
*Goal: detect high-value customer questions and route them to a knowledge backend (non-blocking).*

#### US-7.1 — Intent detector `[Must · 3 · S3]` — **Done**
- **As a** developer, **I want** keyword-based detection of 8 sales intents on customer finals, **so that** only meaningful questions trigger lookups.
- **AC:** detects pricing/security/sla/contract/integration/compliance/competitor/discount; ignores rep speech.
- **Tasks:** `IntentDetector`; keyword map; unit tests.

#### US-7.2 — Work IQ client interface + factory `[Must · 2 · S3]` — **Done**
- **As a** developer, **I want** a `WorkIqClient` interface with a factory, **so that** mock/real are swappable by config.
- **AC:** factory returns mock by default; `WORKIQ_MODE=real` + config selects real client.
- **Tasks:** `WorkIqClient` interface; `createWorkIqClient` factory; mode switch.

#### US-7.3 — Mock Work IQ client `[Must · 2 · S3]` — **Done**
- **As a** presenter, **I want** canned grounded answers with realistic latency, **so that** the demo runs with zero dependencies.
- **AC:** each intent returns answer + 1–2 citations; 1.5–3s simulated latency.
- **Tasks:** `MockWorkIqClient`; canned dataset; latency sim.

#### US-7.4 — Cold-path orchestration `[Must · 3 · S3]` — **Done**
- **As a** rep, **I want** lookups to never block transcription, **so that** the call stays smooth.
- **AC:** intent → async `query`; `workiq:status` (searching) + `workiq:result` events; errors swallowed with log.
- **Tasks:** orchestrator cold path; status/result emits; error handling.

#### US-7.5 — Work IQ result card with citations `[Must · 3 · S3]` — **Done**
- **As a** rep, **I want** the answer plus clickable sources, **so that** I can trust and cite it.
- **AC:** answer text + source list (title + kind icon + link); searching spinner while pending.
- **Tasks:** result card; citation list; source-kind icons.

---

### EPIC 8 — Knowledge Base & RAG Pipeline (Azure AI Search)  ← PRIMARY REMAINING WORK
*Goal: replace the mock with real retrieval-augmented answers grounded in company documents.*

#### US-8.1 — Provision Azure AI Search `[Must · 3 · S3]`
- **As a** dev, **I want** an Azure AI Search service, **so that** we can index and query documents.
- **AC:** Search service created in `rg-workiq-sales-copilot` (Free tier default; Basic if semantic ranker desired); admin key retrieved; endpoint recorded.
- **Tasks:** `az search service create`; capture endpoint + key; add to `.env`; note tier trade-offs.

#### US-8.2 — Deploy embedding model `[Must · 2 · S3]`
- **As a** dev, **I want** `text-embedding-3-small` deployed on the existing OpenAI resource, **so that** we can vectorize text.
- **AC:** deployment created; quota confirmed (eastus); test embedding returns a vector.
- **Tasks:** `az cognitiveservices account deployment create`; smoke-test embedding; env var `AZURE_OPENAI_EMBED_DEPLOYMENT`.

#### US-8.3 — Index schema (vector + metadata) `[Must · 3 · S3]`
- **As a** dev, **I want** a search index with a vector field and citation metadata, **so that** hybrid search returns sources.
- **AC:** fields: `id`, `content`, `contentVector` (HNSW), `title`, `url`, `sourceKind`; vector search profile configured.
- **Tasks:** index JSON definition; create via SDK/REST; verify in portal.

#### US-8.4 — Sample sales knowledge base `[Must · 3 · S3]`
- **As a** presenter, **I want** realistic docs covering all 8 intents, **so that** answers are convincing.
- **AC:** `knowledge/` folder with ≥ 8 docs (pricing, security, SLA, contract, integration, compliance, competitor battlecard, discount matrix); each has a title + source URL.
- **Tasks:** author/collect docs; front-matter (title/url/kind); review for realism. *(Decision: generated samples vs. customer's own docs — confirm with PO.)*

#### US-8.5 — Ingestion pipeline (chunk → embed → upload) `[Must · 5 · S3]`
- **As a** dev, **I want** `npm run ingest` to load docs into the index, **so that** content is searchable.
- **AC:** reads pdf/docx/md/txt; chunks (~500 tokens, overlap); embeds via `text-embedding-3-small`; upserts with stable IDs (idempotent); logs counts/failures.
- **Tasks:** file loader; chunker; embeddings client; batch upload; npm script.

#### US-8.6 — SearchWorkIqClient (RAG) `[Must · 5 · S3]`
- **As a** rep, **I want** real grounded answers, **so that** I can trust the copilot on a live call.
- **AC:** implements `WorkIqClient`; embeds query → hybrid (vector + keyword) search → top-k chunks → `gpt-4.1-mini` composes answer constrained to retrieved context → returns `{answer, sources}`; if no hits, returns a safe "no source found" answer.
- **Tasks:** query embed; search call; grounding prompt (cite-only-from-context); map hits → `WorkIqSource`; timeout/fallback.

#### US-8.7 — Wire factory + config `[Must · 2 · S3]`
- **As a** dev, **I want** `WORKIQ_MODE` to switch to the Search client, **so that** real mode is one env change.
- **AC:** new env vars (`AZURE_SEARCH_ENDPOINT/KEY/INDEX`, `AZURE_OPENAI_EMBED_DEPLOYMENT`) read in `env.ts`; factory selects `SearchWorkIqClient` when configured; `.env.example` updated.
- **Tasks:** extend `env.ts`; update factory; update `.env.example`; docs.

#### US-8.8 — Citation fidelity `[Should · 2 · S3]`
- **As a** rep, **I want** accurate titles/links on sources, **so that** citations are credible.
- **AC:** each source shows correct title, working URL, and `sourceKind` (sharepoint/email/teams/document) mapped from index metadata.
- **Tasks:** metadata mapping; URL validation; kind inference.

#### US-8.9 — Grounding quality eval `[Should · 3 · S4]`
- **As a** QA, **I want** to validate answers across the 8 intents, **so that** we trust the demo.
- **AC:** a test set of ≥ 8 questions; each returns a relevant answer + correct citation; failures logged and triaged.
- **Tasks:** question set; manual/scripted eval; tune chunking/top-k/prompt.

---

### EPIC 9 — Observability & Dev Inspector
*Goal: see inside the pipeline to debug and demo confidently.*

#### US-9.1 — Structured debug bus `[Should · 3 · S4]` — **Done**
- **As a** dev, **I want** structured events per pipeline stage, **so that** I can trace behavior.
- **AC:** `DebugEvent` (level/category/message/data) emitted for audio/speech/intent/workiq/memory/tactic.
- **Tasks:** `DebugBus`; emit points; ring buffer.

#### US-9.2 — Metrics snapshot `[Could · 2 · S4]` — **Done**
- **As a** dev, **I want** counters/gauges ~1/s, **so that** I can spot stalls.
- **AC:** `DebugMetrics` snapshot; counters (segments, lookups) + gauges (compiling, searching).
- **Tasks:** metrics collector; periodic snapshot.

#### US-9.3 — Inspector window (dev-only) `[Should · 3 · S4]` — **Done**
- **As a** dev, **I want** a second window showing events/metrics, **so that** I can debug live.
- **AC:** dev-only window; backfill on open; live updates.
- **Tasks:** inspector window; `DebugInit` backfill; live stream.

#### US-9.4 — Synthetic transcript injection `[Should · 2 · S4]` — **Done**
- **As a** dev, **I want** to inject fake utterances, **so that** I can test without talking.
- **AC:** inspector can push a finalized utterance as Rep/Customer into the pipeline.
- **Tasks:** `DebugTestTranscript` channel; inject handler.

#### US-9.5 — Force memory/tactic triggers `[Could · 1 · S4]` — **Done**
- **As a** dev, **I want** to force a compile/tactic, **so that** I can demo on demand.
- **AC:** buttons trigger `DebugForceMemory` / `DebugForceTactic`.
- **Tasks:** force channels; handlers.

---

### EPIC 10 — Security, Config & Secrets
*Goal: keep keys safe and the app well-behaved.*

#### US-10.1 — Env loading (main only) `[Must · 2 · S4]` — **Done**
- **As a** dev, **I want** secrets loaded only in main via dotenv, **so that** the renderer never sees keys.
- **AC:** `.env` loaded from app folder then repo root; `.env.example` documents all vars.
- **Tasks:** dotenv load order; `.env.example`; config module.

#### US-10.2 — No secrets to renderer `[Must · 3 · S4]`
- **As a** security reviewer, **I want** a verified preload contract exposing only callbacks, **so that** keys can't leak.
- **AC:** preload exposes no secret values; review confirms renderer has no key access; CSP set.
- **Tasks:** audit preload surface; add CSP; document boundary.

#### US-10.3 — Secret hygiene `[Must · 1 · S4]` — **Done**
- **As a** dev, **I want** `.env` gitignored and rotation noted, **so that** secrets aren't committed.
- **AC:** `.gitignore` covers `.env*`; README notes key rotation; no secrets in history.
- **Tasks:** verify gitignore; add rotation note; scan history.

#### US-10.4 — Cost guardrail `[Should · 2 · S4]` — **Done**
- **As a** owner, **I want** a budget alert on the resource group, **so that** spend is monitored.
- **AC:** monthly budget with email alerts at 50/80/100% on `rg-workiq-sales-copilot`.
- **Tasks:** `az consumption budget` (done: $350/mo, 50/80/100%).

#### US-10.5 — Data handling & consent `[Should · 2 · S4]`
- **As a** compliance-minded user, **I want** recording/consent and PII handling addressed, **so that** the PoC is responsible.
- **AC:** demo uses synthetic data; a notice covers recording consent; no real customer data indexed without approval.
- **Tasks:** consent notice; data-source policy; redaction note.

---

### EPIC 11 — Packaging, Demo Readiness & Documentation
*Goal: a repeatable, reliable demo and a clean handoff.*

#### US-11.1 — Production build & package `[Should · 3 · S4]`
- **As a** presenter, **I want** a packaged build, **so that** the demo runs without a dev server.
- **AC:** `npm run build` (vite + tsup) passes; `electron-builder` produces a runnable artifact; packaged app loads the built widget.
- **Tasks:** build scripts; electron-builder config; verify packaged load path.

#### US-11.2 — README & setup guide `[Must · 2 · S4]`
- **As a** new dev, **I want** clear setup docs, **so that** I can run it in minutes.
- **AC:** README covers install, `.env` setup, run, troubleshooting (incl. known gotchas).
- **Tasks:** write README; env table; troubleshooting section.

#### US-11.3 — Demo script & sample call `[Must · 3 · S4]`
- **As a** presenter, **I want** a scripted call hitting each feature, **so that** the demo is repeatable.
- **AC:** a 10-min script triggers transcription, memory, a tactic, and ≥ 1 grounded answer with citation.
- **Tasks:** write script; prep sample audio/Teams call; dry-run.

#### US-11.4 — Smoke-test checklist `[Should · 2 · S4]`
- **As a** QA, **I want** a pre-demo checklist, **so that** we catch breakage early.
- **AC:** checklist verifies install, keys, both audio sources, overlay z-order, RAG answer.
- **Tasks:** author checklist; run before each demo.

#### US-11.5 — Known limitations & next steps `[Could · 1 · S4]`
- **As a** stakeholder, **I want** documented limits and a roadmap, **so that** expectations are set.
- **AC:** doc lists PoC limits (auth, single locale, no persistence) and a path to production (Entra, Graph/Copilot grounding).
- **Tasks:** limitations list; roadmap bullets.

---

## 9. Backlog summary (source of truth — mirrors CSV)

| ID | Epic | Story | Pts | Pri | Sprint | Status |
|---|---|---|---|---|---|---|
| US-1.1 | Foundation | Monorepo scaffold | 3 | Must | S1 | Done |
| US-1.2 | Foundation | Shared types package | 2 | Must | S1 | Done |
| US-1.3 | Foundation | Shared TS config | 1 | Should | S1 | Done |
| US-1.4 | Foundation | Electron main+preload build | 3 | Must | S1 | Done |
| US-1.5 | Foundation | Widget app (Vite/React/Tailwind) | 3 | Must | S1 | Done |
| US-1.6 | Foundation | Dev orchestration | 2 | Must | S1 | Done |
| US-1.7 | Foundation | Quality gates & CI | 3 | Should | S1 | To Do |
| US-2.1 | Audio | Microphone capture | 3 | Must | S1 | Done |
| US-2.2 | Audio | System loopback capture | 5 | Must | S1 | Done |
| US-2.3 | Audio | PCM downsample worklet | 5 | Must | S1 | Done |
| US-2.4 | Audio | Stream PCM → main | 3 | Must | S1 | Done |
| US-2.5 | Audio | Capture controls & permission UX | 2 | Should | S2 | To Do |
| US-3.1 | Transcription | Speech resource & config | 2 | Must | S1 | Done |
| US-3.2 | Transcription | Continuous source recognizer | 5 | Must | S1 | Done |
| US-3.3 | Transcription | Source-based attribution | 3 | Must | S1 | Done |
| US-3.4 | Transcription | Interim+final streaming | 3 | Should | S2 | Done |
| US-3.5 | Transcription | Graceful degradation | 2 | Must | S2 | Done |
| US-4.1 | Memory | Rolling buffer flush | 3 | Must | S2 | Done |
| US-4.2 | Memory | Memory compiler (OpenAI) | 5 | Must | S2 | Done |
| US-4.3 | Memory | Memory render in UI | 3 | Should | S2 | Done |
| US-4.4 | Memory | CRM-note prompt engineering | 3 | Should | S2 | To Do |
| US-4.5 | Memory | Degrade without OpenAI | 1 | Must | S2 | Done |
| US-5.1 | Tactics | Tactic timer & context | 3 | Must | S2 | Done |
| US-5.2 | Tactics | Tactic prompt | 3 | Should | S2 | To Do |
| US-5.3 | Tactics | Tactic card UI | 2 | Should | S2 | Done |
| US-6.1 | UI | Always-on-top overlay | 5 | Must | S2 | Done |
| US-6.2 | UI | Live transcript feed | 3 | Must | S2 | Done |
| US-6.3 | UI | Copilot recommendations panel | 3 | Must | S2 | Done |
| US-6.4 | UI | Call intelligence panel | 3 | Should | S2 | Done |
| US-6.5 | UI | Move/resize/collapse | 3 | Should | S3 | To Do |
| US-6.6 | UI | Visual states & motion | 2 | Could | S3 | To Do |
| US-7.1 | Work IQ | Intent detector | 3 | Must | S3 | Done |
| US-7.2 | Work IQ | Client interface + factory | 2 | Must | S3 | Done |
| US-7.3 | Work IQ | Mock client | 2 | Must | S3 | Done |
| US-7.4 | Work IQ | Cold-path orchestration | 3 | Must | S3 | Done |
| US-7.5 | Work IQ | Result card w/ citations | 3 | Must | S3 | Done |
| US-8.1 | RAG | Provision Azure AI Search | 3 | Must | S3 | To Do |
| US-8.2 | RAG | Deploy embedding model | 2 | Must | S3 | To Do |
| US-8.3 | RAG | Index schema (vector) | 3 | Must | S3 | To Do |
| US-8.4 | RAG | Sample knowledge base | 3 | Must | S3 | To Do |
| US-8.5 | RAG | Ingestion pipeline | 5 | Must | S3 | To Do |
| US-8.6 | RAG | SearchWorkIqClient (RAG) | 5 | Must | S3 | To Do |
| US-8.7 | RAG | Wire factory + config | 2 | Must | S3 | To Do |
| US-8.8 | RAG | Citation fidelity | 2 | Should | S3 | To Do |
| US-8.9 | RAG | Grounding quality eval | 3 | Should | S4 | To Do |
| US-9.1 | Observability | Structured debug bus | 3 | Should | S4 | Done |
| US-9.2 | Observability | Metrics snapshot | 2 | Could | S4 | Done |
| US-9.3 | Observability | Inspector window | 3 | Should | S4 | Done |
| US-9.4 | Observability | Synthetic transcript inject | 2 | Should | S4 | Done |
| US-9.5 | Observability | Force memory/tactic | 1 | Could | S4 | Done |
| US-10.1 | Security | Env loading (main only) | 2 | Must | S4 | Done |
| US-10.2 | Security | No secrets to renderer | 3 | Must | S4 | To Do |
| US-10.3 | Security | Secret hygiene | 1 | Must | S4 | Done |
| US-10.4 | Security | Cost guardrail | 2 | Should | S4 | Done |
| US-10.5 | Security | Data handling & consent | 2 | Should | S4 | To Do |
| US-11.1 | Demo | Production build & package | 3 | Should | S4 | To Do |
| US-11.2 | Demo | README & setup guide | 2 | Must | S4 | To Do |
| US-11.3 | Demo | Demo script & sample call | 3 | Must | S4 | To Do |
| US-11.4 | Demo | Smoke-test checklist | 2 | Should | S4 | To Do |
| US-11.5 | Demo | Known limitations & next steps | 1 | Could | S4 | To Do |

**Totals:** 60 stories · 165 points. Remaining (To Do): 60 points, concentrated in Epic 8 (RAG, ~28 pts) + Epics 10–11.

### Points by sprint
| Sprint | Points | Stories | Focus |
|---|---|---|---|
| S1 | 43 | 14 | Foundation, audio, transcription |
| S2 | 44 | 15 | Memory, tactics, UI |
| S3 | 43 | 15 | Work IQ + **RAG** |
| S4 | 35 | 16 | Observability, security, demo |

> Suggested velocity for a 2–3 person team: ~35–45 pts/sprint at a hackathon pace (much of S1–S2 is verification of existing code).

---

## 10. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Azure AI Search Free tier limits (50 MB, no semantic ranker) | Med | Med | Keep KB small; upgrade to Basic if re-ranking needed (US-8.1) |
| RAG answers hallucinate beyond sources | Med | High | Strict "cite-only-from-context" prompt + eval (US-8.6/8.9) |
| Loopback audio capture varies by Windows/Electron version | Med | High | Pin Electron ^33; fallback path; test on demo machine |
| Speech concurrency / cost on long calls | Low | Med | S0 tier (2 streams); budget alert (US-10.4) |
| Demo machine permission prompts | Med | Med | Pre-grant mic/loopback; smoke-test checklist (US-11.4) |
| Model/deployment deprecation | Low | Med | Pinned `gpt-4.1-mini`; note in README |

---

## 11. Metrics & demo acceptance

- **Latency:** transcript interim < ~1s; Work IQ answer < ~4s.
- **Grounding:** ≥ 8/8 demo questions return a relevant answer + ≥ 1 correct citation.
- **Stability:** 10-min call with no crash; overlay stays on top.
- **Safety:** no secret in renderer; app runs degraded with a missing key.

---

## 12. Importing into a free Scrum tool

A companion file, **`backlog-import.csv`** (same folder), contains every Epic and Story with points, priority, sprint, labels, acceptance criteria, and an embedded task checklist. It is tuned for **Jira**, and maps cleanly to Azure DevOps, Taiga, and Trello.

### CSV columns
`Issue Type, Summary, Epic Link, Description, Acceptance Criteria, Tasks, Story Points, Priority, Labels, Sprint, Status`

### Option A — Jira (free up to 10 users) — recommended
1. Create a **Scrum** project.
2. **Project settings → Issue types**: ensure `Epic`, `Story` exist.
3. Gear (top-right) → **System → External System Import → CSV** (or **Backlog → ⋯ → Import issues**).
4. Upload `backlog-import.csv`; on the mapping screen map:
   - `Issue Type → Issue Type`, `Summary → Summary`, `Epic Link → Epic Link`, `Description → Description`, `Story Points → Story point estimate`, `Priority → Priority`, `Labels → Labels`, `Sprint → Sprint`, `Status → Status`.
   - Map `Acceptance Criteria` and `Tasks` to custom fields, or append to Description.
5. Import. Then create Sprints 1–4 and drag stories in by the `Sprint` value.

### Option B — Azure DevOps Boards (free up to 5 users) — great if you're already in ADO
1. Create a project (process: **Agile**).
2. **Boards → Work Items → Import Work Items → CSV**.
3. Rename the header row to ADO fields: `Work Item Type, Title, Description, Story Points, Priority, Tags, Iteration Path`. Map types: `Epic→Epic`, `Story→User Story`.
4. Put `Acceptance Criteria` into the **Acceptance Criteria** field; `Tasks` into Description (or split into child **Task** items after import).
5. Import; set **Iteration Path** to your sprints.

### Option C — Taiga (free / open-source) — fully free forever
1. Create a **Scrum** project at taiga.io (or self-host).
2. **Backlog → ⋯ menu → Import** (Taiga supports CSV user-story import).
3. Map `Summary→subject`, `Description→description`, `Story Points→points`, `Tags/Labels`, `Status`. Epics map to Taiga **Epics**.

### Option D — Trello (free) — simplest kanban
1. Create a board with lists = sprints (or status).
2. Use **Board menu → … → Import CSV** (or a CSV-import Power-Up); each row becomes a card; `Tasks` becomes the card description/checklist.

### Option E — GitHub Projects (free) — if you live in GitHub
- Convert rows to issues with the GitHub CLI, e.g.:
  ```bash
  # from a CSV row: gh issue create --title "<Summary>" --body "<Description + AC + Tasks>" --label "<Labels>"
  ```
  Then add issues to a Project (Board) and group by a custom `Sprint` field.

> **Tip:** Whichever tool you pick, import once into a throwaway project first to confirm field mapping, then re-import into the real project.

---

## 13. Glossary

- **RAG** — Retrieval-Augmented Generation: retrieve relevant chunks, then have the LLM answer using only those.
- **Grounding** — constraining the model to answer from retrieved sources (and cite them).
- **Loopback** — capturing the computer's audio output (the remote participant) as an input stream.
- **Cold path** — non-blocking background work (Work IQ lookup) that never delays transcription.
- **DoR / DoD** — Definition of Ready / Done.
