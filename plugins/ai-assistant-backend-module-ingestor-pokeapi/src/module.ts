import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { createPokeAPIIngestor } from './services/ingestor';
import { dataIngestorExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export const aiAssistantModuleIngestorPokeapi = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'ingestor-pokeapi',
  register(reg) {
    reg.registerInit({
      deps: {
        dataIngestor: dataIngestorExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ config, logger, dataIngestor }) {
        dataIngestor.registerIngestor(
          await createPokeAPIIngestor({ config, logger }),
        );
      },
    });
  },
});
