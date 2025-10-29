import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  Model,
  modelProviderExtensionPoint,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { ChatVertexAI } from '@langchain/google-vertexai';

export const aiAssistantModuleModelProviderGoogleVertexAi = createBackendModule(
  {
    pluginId: 'ai-assistant',
    moduleId: 'model-provider-google-vertex-ai',
    register(reg) {
      reg.registerInit({
        deps: {
          config: coreServices.rootConfig,
          modelProvider: modelProviderExtensionPoint,
        },
        async init({ config, modelProvider }) {
          const vertexAiConfig = config.getConfig(
            'aiAssistant.models.googleVertexAi',
          );

          const apiKey = vertexAiConfig.getString('apiKey');
          const modelIds = vertexAiConfig.getStringArray('models');

          const models: Model[] = modelIds.map(modelId => {
            return {
              id: modelId,
              chatModel: new ChatVertexAI({
                model: modelId,
                apiKey: apiKey,
              }),
            };
          });

          models.forEach(model => modelProvider.register(model));
        },
      });
    },
  },
);
