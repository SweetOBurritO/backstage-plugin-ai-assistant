import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { chatApiRef, createChatService } from './api/chat';
import { pageSummarizationApiRef, createPageSummarizationService } from './api/page-summarizer';

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
      api: pageSummarizationApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createPageSummarizationService(options),
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
