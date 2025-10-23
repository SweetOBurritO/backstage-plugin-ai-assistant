# Creating a Model Provider for AI Assistant

This guide explains how to set up a custom model provider for the AI Assistant plugin in Backstage, with a focus on integrating LangChain models.

## Defining a Model Provider

### Scaffold the module

This example shows how to configure a model provider for Azure AI Foundry. Azure AI foundry supports using the OpenAI sdk for interfacing with your model deployment for most models so this is the example we will use.

The first thing we should do is create a new [plugin module](https://backstage.io/docs/backend-system/architecture/modules/) plugin.

Run this command and replace `<name>` with the name you want to give your provider. i.e ollama, openai etc

```sh
yarn new --select backend-plugin-module --option pluginId='ai-assistant' --option moduleId=model-provider-<name>
```

This will scaffold a basic plugin module ready to create the provider logic.

### Define config

Next, we should do is define config for our models. You should define a new key for your provider under the models key of the assistant config. From here you can define the config as needed for your provider. Azure AI foundry uses a common API key for all models and then individual models may connect to different endpoints.

With this in mind we can define the following config in our `app.config.yaml`

```yaml
aiAssistant:
  models:
    azureAi:
      apiKey: ${AZURE_AI_API_KEY}
      models:
        - modelName: gpt-4o-mini
          endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
        - modelName: gpt-5-mini
          endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
```

### Creating models

Now you should define a mechanism for creating models. Azure AI foundry supports using the OpenAI sdk for interfacing with models. We can use langchain's existing packages for this.

```ts
// services/open-ai-chat-model.ts
import { ChatOpenAI } from '@langchain/openai';

type CreateChatModelFunctionOptions = {
  apiKey: string;
  endpoint: string;
  modelName: string;
};

type CreateChatModelFunction = (
  options: CreateChatModelFunctionOptions,
) => BaseChatModel;

export const createOpenAiChatModel: CreateChatModelFunction = options => {
  return new ChatOpenAI({
    configuration: {
      apiKey: options.apiKey,
      baseURL: options.endpoint,
    },
    modelName: options.modelName,
  });
};

```

### Registering models in the module

Lastly we can connect this all together. In the example below we will:

- use the config service to fetch our api key and the list of models and their individual config
- Loop through those models and create a model for each config entry
- Use the extension point provided by the ai assistant to register each of these models

```diff
// module.ts
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

++import {
++  Model,
++  modelProviderExtensionPoint,
++} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
++import { createOpenAiChatModel } from './services/open-ai-chat-model';

export const aiAssistantModuleModelProviderAzureAi = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'model-provider-azure-ai',
  register(reg) {
    reg.registerInit({
      deps: {
--        logger: coreServices.rootLogger
++        config: coreServices.rootConfig,
++        modelProvider: modelProviderExtensionPoint, // Adds the extension point as a dependency to our module so we can access it
      },
--      async init({ logger }) {
++      async init({ config, modelProvider }) {
--        logger.info('Hello World!');

++        const azureConfig = config.getConfig('aiAssistant.models.azureAi'); // Fetches the config for our provider
++
++        const apiKey = azureConfig.getString('apiKey');
++        const modelConfigs = azureConfig.getOptionalConfigArray('models'); // gets the models to setup as an array
++
++        const models: Model[] =
++          modelConfigs?.map<Model>(modelConfig => {
++            const endpoint = modelConfig.getString('endpoint');
++            const modelName = modelConfig.getString('modelName');
++
++            const chatModel = createOpenAiChatModel({
++              apiKey,
++              endpoint,
++              modelName,
++            });
++
++            return {
++              id: modelName, // Defines an ID for the model. This is what the user sees to select a model on the frontend
++              chatModel,
++            };
++          }) ?? [];
++
++        models.forEach(model => modelProvider.register(model)); // Register our list of models
      },
    });
  },
});

## Using your model provider

At this point your provider is ready to use. You can simply add it to your backend and the models defined in the config for your provider will be available for use.

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

++backend.add(
++  import(
++    '@internal/backstage-plugin-ai-assistant-backend-module-model-provider-azure'
++  ),
++);

```
