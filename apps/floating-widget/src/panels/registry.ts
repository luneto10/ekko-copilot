import type { PanelDefinition } from './types';
import { conversationPanel } from '@/features/keynotes';
import { transcriptPanel } from '@/features/transcript';
import { copilotPanel } from '@/features/copilot';

export const PANELS: PanelDefinition[] = [
  conversationPanel,
  transcriptPanel,
  copilotPanel,
];
