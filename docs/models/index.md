# What is a Model Provider?

A **model provider** is a [plugin module](https://backstage.io/docs/backend-system/architecture/modules/) that supplies AI models to the AI Assistant plugin. Each provider registers one or more llm models that implement the required interface, making them available for use in chat or other AI features.

The AI Assistant plugin is built around the [langchain](https://js.langchain.com/docs/introduction/) ecosystem. Any model you provide in your model provider should extend the [BaseChatModel](https://js.langchain.com/docs/concepts/chat_models/#interface) provided by `langchain` or wrap an existing model implementation from `langchain` that already extends this interface.

This allows for a standard model interface to be used by the AI assistant to make calls to your configured LLM.

## Using a model provider

- Select a provider from the list below
- Add the provider to your backend

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

- Update your `app-config.yaml` with the required config of the provider

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

## Available Providers

| Name     | Service                                                                                          | Link to Provider                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Ollama   | [Ollama/OpenWebUI](https://docs.openwebui.com/getting-started/quick-start/starting-with-ollama/) | [Github](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/tree/main/plugins/ai-assistant-backend-module-model-provider-ollama)   |
| Azure AI | [Azure AI Foundry](https://ai.azure.com/)                                                        | [Github](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/tree/main/plugins/ai-assistant-backend-module-model-provider-azure-ai) |
