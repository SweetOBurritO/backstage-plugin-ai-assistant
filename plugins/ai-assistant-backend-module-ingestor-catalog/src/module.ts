import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { dataIngestorExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createCatalogIngestor } from './services/ingestor';

export const aiAssistantModuleIngestorCatalog = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'ingestor-catalog',
  register(reg) {
    reg.registerInit({
      deps: {
        dataIngestor: dataIngestorExtensionPoint,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
      },
      async init(options) {
        const { dataIngestor } = options;
        dataIngestor.registerIngestor(await createCatalogIngestor(options));
      },
    });
  },
});
