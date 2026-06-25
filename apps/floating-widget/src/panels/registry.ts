import type { PanelDefinition } from './types';
import { conversationPanel } from '@/features/keynotes';
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
 * NOTE: the old Live Feed (transcript) and Call Intelligence (memory.md) panels
 * are no longer shown. The transcript + memory pipelines still run inside the
 * main process to ground key notes and tactics — that "call intelligence" is
 * now internal context rather than its own panel.
 *
 * See `docs/FEATURE_GUIDE.md` for the full step-by-step.
 */
export const PANELS: PanelDefinition[] = [
  conversationPanel, // Key-note pills + per-note chatbot (grounded by Work IQ)
  copilotPanel, // Wolf Tactic — real-time coaching nudge
];
