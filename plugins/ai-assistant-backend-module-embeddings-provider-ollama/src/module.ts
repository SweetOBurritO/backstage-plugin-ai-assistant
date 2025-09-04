import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { embeddingsProviderExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { OllamaEmbeddings } from '@langchain/ollama';

export const aiAssistantModuleEmbeddingsProviderOllama = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'embeddings-provider-ollama',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        embeddingsProvider: embeddingsProviderExtensionPoint,
      },
      async init({ embeddingsProvider, config }) {
        const model = config.getString('aiAssistant.embeddings.ollama.model');
        const apiKey = config.getString('aiAssistant.embeddings.ollama.apiKey');
        const baseUrl = config.getString(
          'aiAssistant.embeddings.ollama.baseUrl',
        );

        const embeddings = new OllamaEmbeddings({
          baseUrl,
          model,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        return embeddingsProvider.register({
          getEmbeddings: async () => embeddings,
        });
      },
    });
  },
});
