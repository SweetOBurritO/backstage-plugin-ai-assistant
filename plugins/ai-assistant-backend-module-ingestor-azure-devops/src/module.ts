import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

export const aiAssistantModuleIngestorAzureDevops = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'ingestor-azure-devops',
  register(reg) {
    reg.registerInit({
      deps: { logger: coreServices.logger },
      async init({ logger }) {
        logger.info('Hello World!');
      },
    });
  },
});
