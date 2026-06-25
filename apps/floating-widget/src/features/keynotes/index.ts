import type { PanelDefinition } from '@/panels/types';
import { Conversation } from './Conversation';

/**
 * Public surface of the conversation feature: key-note pills + per-note chat.
 * Grows to fill the widget's main area. Registered in `src/panels/registry.ts`.
 */
export const conversationPanel: PanelDefinition = {
  id: 'conversation',
  Component: Conversation,
  grow: true,
};

export { Conversation } from './Conversation';
export { useConversation } from './useConversation';
