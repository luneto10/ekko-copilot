import type { PanelDefinition } from './types';
import { conversationPanel } from '@/features/keynotes';
import { transcriptPanel } from '@/features/transcript';
import { copilotPanel } from '@/features/copilot';

/**
 * THE LAYOUT KNOB — the single source of truth for the widget's panels.
 *
 * The order of this array is the order panels render, top → bottom. To:
 *   • **add** a feature  → build it under `src/features/<name>/`, export a
 *     `PanelDefinition`, and add it to this list;
 *   • **remove** a feature → delete its entry here (and its folder);
 *   • **reorder** the UI  → reorder this array.
 *
 * Nothing in `App.tsx` needs to change — it simply maps over this list.
 *
 * NOTE: the old Call Intelligence (memory.md) panel is no longer shown — the
 * transcript + memory pipelines still run inside the main process to ground key
 * notes and tactics ("call intelligence" as internal context). The Live
 * Transcript below is a small, scrollable strip just to confirm capture.
 *
 * See `docs/FEATURE_GUIDE.md` for the full step-by-step.
 */
export const PANELS: PanelDefinition[] = [
  conversationPanel, // Key-note pills + per-note chatbot (grounded by Work IQ)
  transcriptPanel, // Small live-transcript strip — confirms voices are captured
  copilotPanel, // Wolf Tactic — real-time coaching nudge
];
