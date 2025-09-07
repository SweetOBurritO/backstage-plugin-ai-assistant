import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

import {
  Model,
  modelProviderExtensionPoint,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AzureAiInferenceChatModel } from './azure-ai-inference-chat-model';

import { BaseChatModel } from '@langchain/core/language_models/chat_models';

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
        const azureConfig = config.getConfig(
          'aiAssistant.models.azureAiInference',
        );

        const apiKey = azureConfig.getString('apiKey');
        const modelConfigs = azureConfig.getOptionalConfigArray('models');

        const models: Model[] =
          modelConfigs?.map<Model>(modelConfig => {
            const endpoint = modelConfig.getString('endpoint');
            const modelName = modelConfig.getString('modelName');

            const chatModel: BaseChatModel = new AzureAiInferenceChatModel({
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
