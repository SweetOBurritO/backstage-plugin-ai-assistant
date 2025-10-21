import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { toolExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createSearchWikipediaTool } from './tools/wikipedia';

export const aiAssistantModuleToolProviderSearch = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'tool-provider-search',
  register(reg) {
    reg.registerInit({
      deps: { logger: coreServices.logger, toolExtension: toolExtensionPoint },
      async init({ toolExtension }) {
        toolExtension.register(createSearchWikipediaTool({}));
      },
    });
  },
});
