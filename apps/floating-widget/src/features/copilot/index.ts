import type { PanelDefinition } from '@/panels/types';
import { CopilotRecommendations } from './CopilotRecommendations';

export const copilotPanel: PanelDefinition = {
  id: 'copilot',
  Component: CopilotRecommendations,
};

export { CopilotRecommendations } from './CopilotRecommendations';
export { useCopilot } from './useCopilot';
