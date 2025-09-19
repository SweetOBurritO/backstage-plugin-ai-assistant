import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

import {
  Model,
  modelProviderExtensionPoint,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createChatModeForSdk } from './services/chat-model';

export const aiAssistantModuleModelProviderAzureAi = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'model-provider-azure-ai',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        modelProvider: modelProviderExtensionPoint,
      },
      async init({ config, modelProvider }) {
        const azureConfig = config.getConfig('aiAssistant.models.azureAi');

        const apiKey = azureConfig.getString('apiKey');
        const modelConfigs = azureConfig.getOptionalConfigArray('models');

        const models: Model[] =
          modelConfigs?.map<Model>(modelConfig => {
            const endpoint = modelConfig.getString('endpoint');
            const modelName = modelConfig.getString('modelName');
            const sdk = modelConfig.getOptionalString('sdk') ?? 'openai';

            const chatModel = createChatModeForSdk(sdk, {
              apiKey,
              endpoint,
              modelName,
            });

            return {
              id: modelName,
              chatModel,
            };
          }) ?? [];

        models.forEach(model => modelProvider.register(model));
      },
    });
  },
});
