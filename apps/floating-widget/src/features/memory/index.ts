import type { PanelDefinition } from '@/panels/types';
import { CallIntelligence } from './CallIntelligence';

/**
 * Public surface of the memory feature: its panel definition.
 * Registered in `src/panels/registry.ts`.
 */
export const memoryPanel: PanelDefinition = {
  id: 'memory',
  Component: CallIntelligence,
  grow: true,
};

export { CallIntelligence } from './CallIntelligence';
export { useMemory } from './useMemory';
