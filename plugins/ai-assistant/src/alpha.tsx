import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  AppRootElementBlueprint,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { rootRouteRef } from './routes';

import { chatApiRef, createChatService } from './api/chat';
import { mcpApiRef, createMcpService } from './api/mcp';
import { createSummarizerService, summarizerApiRef } from './api/summarizer';

import { AiAssistantChatModal } from './components/AiAssistantChatModal';

const aiAssistantPage = PageBlueprint.make({
  params: {
    path: '/ai-assistant',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/AiAssistantPage').then(m => <m.AiAssistantPage />),
  },
});

const chatApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: chatApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createChatService(options),
    }),
});

const mcpApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: mcpApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createMcpService(options),
    }),
});

const summarizerApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: summarizerApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: options => createSummarizerService(options),
    }),
});

const aiAssistantChatModal = AppRootElementBlueprint.make({
  name: 'AiAssistantChatModal',
  params: {
    element: <AiAssistantChatModal />,
  },
});

export default createFrontendPlugin({
  pluginId: 'ai-assistant',
  extensions: [
    aiAssistantPage,
    aiAssistantChatModal,
    chatApi,
    mcpApi,
    summarizerApi,
  ],
  routes: {
    root: rootRouteRef,
  },
});
