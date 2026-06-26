import type { PanelDefinition } from '@/panels/types';
import { Conversation } from './Conversation';

export const conversationPanel: PanelDefinition = {
  id: 'conversation',
  Component: Conversation,
  grow: true,
};

export { Conversation } from './Conversation';
export { useConversation } from './useConversation';
