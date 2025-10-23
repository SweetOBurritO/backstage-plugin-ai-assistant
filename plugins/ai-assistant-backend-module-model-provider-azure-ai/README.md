# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai

This module provides an Azure AI (Azure OpenAI / Azure Foundry) model provider implementation for the
[backstage-plugin-ai-assistant](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant) backend. It lets the AI Assistant backend call Azure-hosted models (chat or completion)
using a configuration-driven provider so the rest of the plugin can remain model-agnostic.

## Features

- Connects Backstage AI Assistant to Azure-hosted LLM models (Azure OpenAI / Azure Foundry).
- Configuration via Backstage `app-config.yaml` and environment variables.

## When to use

Use this module when you want the AI Assistant backend to use models hosted in Azure (for example: GPT-family models
deployed in Azure OpenAI or Azure AI Foundry deployments) in the backstage ai assistant.

## Configuration

Add the provider configuration in your `app-config.local`.

```yaml
aiAssistant:
  models:
    azureAi:
      apiKey: ${AZURE-AI-API-KEY}
      models:
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/ # Replace with your deployment endpoint
          modelName: 'gpt-5-mini'
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: 'DeepSeek-R1'
```

## Install

Install the plugin into your backstage backend with the following command

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai
```

Add it to your backend

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

++backend.add(
++  import(
++    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
++  ),
++);

```
