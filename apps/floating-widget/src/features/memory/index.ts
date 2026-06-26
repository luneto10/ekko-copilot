import type { PanelDefinition } from '@/panels/types';
import { CallIntelligence } from './CallIntelligence';

export const memoryPanel: PanelDefinition = {
  id: 'memory',
  Component: CallIntelligence,
  grow: true,
};

export { CallIntelligence } from './CallIntelligence';
export { useMemory } from './useMemory';
