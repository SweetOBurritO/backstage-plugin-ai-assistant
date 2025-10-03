import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { createGitHubIngestor } from './services/ingestor';
import { dataIngestorExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export const aiAssistantModuleIngestorGithub = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'ingestor-github',
  register(reg) {
    reg.registerInit({
      deps: {
        dataIngestor: dataIngestorExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ config, logger, dataIngestor }) {
        dataIngestor.registerIngestor(
          await createGitHubIngestor({ config, logger }),
        );
      },
    });
  },
});
