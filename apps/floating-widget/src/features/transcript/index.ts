import type { PanelDefinition } from '@/panels/types';
import { LiveFeed } from './LiveFeed';

export const transcriptPanel: PanelDefinition = {
  id: 'transcript',
  Component: LiveFeed,
};

export { LiveFeed } from './LiveFeed';
export { useTranscript } from './useTranscript';
