import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { ChatOllama } from '@langchain/ollama';
import {
  Model,
  modelProviderExtensionPoint,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export const aiAssistantModuleModelProviderOllama = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'model-provider-ollama',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        modelProvider: modelProviderExtensionPoint,
      },
      async init({ config, modelProvider }) {
        const ollamaConfig = config.getConfig('aiAssistant.models.ollama');

        const baseUrl = ollamaConfig.getString('baseUrl');
        const apiKey = ollamaConfig.getString('apiKey');
        const modelIds = ollamaConfig.getStringArray('models');

        const models: Model[] = modelIds.map(modelId => {
          return {
            id: modelId,
            chatModel: new ChatOllama({
              baseUrl,
              model: modelId,
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }),
          };
        });

        models.forEach(model => modelProvider.register(model));
      },
    });
  },
});
