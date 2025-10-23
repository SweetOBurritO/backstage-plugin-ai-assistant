# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai

An embeddings provider module that lets the Backstage AI Assistant backend create vector embeddings
using Azure-hosted embedding models (Azure OpenAI / Azure AI Foundry).

This README explains how the provider works, when to use it, configuration options, and how to wire
it into your Backstage backend.

## Features

- Convert text or documents to numeric vector embeddings using Azure OpenAI / Azure AI Foundry
 embedding deployments.
- Exposes a provider implementation compatible with the AI Assistant backend so different
 embeddings services can be swapped without changing the rest of the app.
- Handles basic batching and optional configuration for deployment name / endpoint selection.

## When to use

Use this module if you run Azure-hosted embedding models and want the AI Assistant to build
semantic search indices, vector stores, or provide retrieval-augmented generation (RAG)
capabilities in Backstage.

## Configuration

Add the provider configuration to your Backstage `app-config.yaml` or `app-config.local.yaml` under
`aiAssistant.embeddings.azureOpenAI`.

Minimum configuration keys (example):

```yaml
aiAssistant:
  embeddings:
    azureOpenAI:
      endpoint: 'https://eastus.api.cognitive.microsoft.com/openai/deployments/text-embedding-3-large/embeddings?api-version=2023-05-15'
      openAIApiVersion: 2024-12-01-preview
      deploymentName: 'text-embedding-3-large'
      instanceName: 'eastus'
      apiKey: ${AZURE_OPENAI_API_KEY}

```

Field descriptions:

- `endpoint` - The full Azure endpoint URL for the embeddings deployment. This may include
 the deployment path and api-version query parameter depending on your Azure setup.
- `deploymentName` - The name of the deployment that provides the embeddings model.
- `instanceName` - The Azure instance / region name (used for telemetry or constructing alternate
 endpoint forms in some setups).
- `apiKey` - Your Azure OpenAI or Azure AI API key. Marked as secret in configuration.
- `openAIApiVersion` -

The exact keys available and required depend on your Azure configuration. Check the provider's
`config.d.ts` in the package for the canonical types used by the module.

## Install

Install the module into your Backstage backend workspace:

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai
```

## Wire the provider into your backend

Add the provider module import to your backend entrypoint (usually `packages/backend/src/index.ts`):

```diff
// packages/backend/src/index.ts

// other backend modules...
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add the Azure OpenAI embeddings provider
++backend.add(
++ import(
++  '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
++ ),
++);
```

Restart your backend after adding the provider so it registers with the AI Assistant plugin.
