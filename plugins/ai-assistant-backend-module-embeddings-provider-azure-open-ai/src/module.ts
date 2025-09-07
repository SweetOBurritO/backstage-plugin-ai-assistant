import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { embeddingsProviderExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AzureOpenAIEmbeddings } from '@langchain/openai';

export const aiAssistantModuleEmbeddingsProviderAzureOpenAi =
  createBackendModule({
    pluginId: 'ai-assistant',
    moduleId: 'embeddings-provider-azure-openai',
    register(reg) {
      reg.registerInit({
        deps: {
          logger: coreServices.logger,
          config: coreServices.rootConfig,
          embeddingsProvider: embeddingsProviderExtensionPoint,
        },
        async init({ embeddingsProvider, config }) {
          const deploymentName = config.getString(
            'aiAssistant.embeddings.azureOpenAi.deploymentName',
          );

          const instanceName = config.getString(
            'aiAssistant.embeddings.azureOpenAi.instanceName',
          );
          const apiKey = config.getString(
            'aiAssistant.embeddings.azureOpenAi.apiKey',
          );
          const endpoint = config.getString(
            'aiAssistant.embeddings.azureOpenAi.endpoint',
          );

          const openAIApiVersion = config.getString(
            'aiAssistant.embeddings.azureOpenAi.openAIApiVersion',
          );

          const embeddings = new AzureOpenAIEmbeddings({
            azureOpenAIApiEmbeddingsDeploymentName: deploymentName,
            azureOpenAIApiInstanceName: instanceName,
            azureOpenAIEndpoint: endpoint,
            azureOpenAIApiKey: apiKey,
            openAIApiVersion: openAIApiVersion,
          });

          return embeddingsProvider.register({
            getEmbeddings: async () => embeddings,
          });
        },
      });
    },
  });
