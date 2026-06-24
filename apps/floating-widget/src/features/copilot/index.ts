import type { PanelDefinition } from '@/panels/types';
import { CopilotRecommendations } from './CopilotRecommendations';

/**
 * Public surface of the copilot feature: its panel definition.
 * `grow` is omitted so the box sizes to its content at the bottom of the widget.
 * Registered in `src/panels/registry.ts`.
 */
export const copilotPanel: PanelDefinition = {
  id: 'copilot',
  Component: CopilotRecommendations,
};

export { CopilotRecommendations } from './CopilotRecommendations';
export { useCopilot } from './useCopilot';
