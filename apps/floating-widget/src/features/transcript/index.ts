import type { PanelDefinition } from '@/panels/types';
import { LiveFeed } from './LiveFeed';

/**
 * Public surface of the transcript feature: its panel definition.
 * Registered in `src/panels/registry.ts`.
 */
export const transcriptPanel: PanelDefinition = {
  id: 'transcript',
  Component: LiveFeed,
};

export { LiveFeed } from './LiveFeed';
export { useTranscript } from './useTranscript';
