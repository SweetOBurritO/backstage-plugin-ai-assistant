import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'ai-assistant',
});

export const newConversationRouteRef = createSubRouteRef({
  id: 'ai-assistant.new-conversation',
  parent: rootRouteRef,
  path: '/conversation',
});

export const conversationRouteRef = createSubRouteRef({
  id: 'ai-assistant.conversation',
  parent: rootRouteRef,
  path: '/conversation/:id',
});

export const shareConversationRouteRef = createSubRouteRef({
  id: 'ai-assistant.share-conversation',
  parent: rootRouteRef,
  path: '/share/:shareId',
});
