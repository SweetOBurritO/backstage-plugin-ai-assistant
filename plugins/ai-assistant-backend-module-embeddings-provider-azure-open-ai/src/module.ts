import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { embeddingsProviderExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AzureOpenAIEmbeddings } from '@langchain/openai';

export const aiAssistantModuleEmbeddingsProviderAzureOpenAi =
  createBackendModule({
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
          const deployment = config.getString(
            'aiAssistant.embeddings.azureOpenAi.deployment',
          );
          const apiKey = config.getString(
            'aiAssistant.embeddings.azureOpenAi.apiKey',
          );
          const endpoint = config.getString(
            'aiAssistant.embeddings.azureOpenAi.endpoint',
          );

          const embeddings = new AzureOpenAIEmbeddings({
            azureOpenAIApiEmbeddingsDeploymentName: deployment,
            azureOpenAIEndpoint: endpoint,
            azureOpenAIApiKey: apiKey,
          });

          return embeddingsProvider.register({
            getEmbeddings: async () => embeddings,
          });
        },
      });
    },
  });
