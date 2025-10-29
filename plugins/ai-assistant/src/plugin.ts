import {
  createPlugin,
  createRoutableExtension,
  createComponentExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { chatApiRef, createChatService } from './api/chat';
import { mcpApiRef, createMcpService } from './api/mcp';

export const aiAssistantPlugin = createPlugin({
  id: 'ai-assistant',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: chatApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createChatService(options),
    }),
    createApiFactory({
      api: mcpApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createMcpService(options),
    }),
  ],
});

export const AiAssistantPage = aiAssistantPlugin.provide(
  createRoutableExtension({
    name: 'AiAssistantPage',
    component: () =>
      import('./components/AiAssistantPage').then(m => m.AiAssistantPage),
    mountPoint: rootRouteRef,
  }),
);

export const AiAssistantChatModal = aiAssistantPlugin.provide(
  createComponentExtension({
    name: 'AiAssistantChatModal',
    component: {
      lazy: () =>
        import('./components/AiAssistantChatModal').then(
          m => m.AiAssistantChatModal,
        ),
    },
  }),
);
