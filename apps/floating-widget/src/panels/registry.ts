import type { PanelDefinition } from './types';
import { transcriptPanel } from '@/features/transcript';
import { memoryPanel } from '@/features/memory';
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
 * See `docs/FEATURE_GUIDE.md` for the full step-by-step.
 */
export const PANELS: PanelDefinition[] = [
  transcriptPanel, // Live Feed — running dialogue by speaker
  memoryPanel, // Call Intelligence — rolling memory.md
  copilotPanel, // Copilot · Work IQ — grounded answers + Wolf Tactic
];
