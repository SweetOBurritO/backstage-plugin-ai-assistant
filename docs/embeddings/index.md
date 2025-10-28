# Embeddings Providers

An "embeddings provider" is a backend module that provides an embeddings model for vector embeddings for text (or other data) so they can be stored and searched by the AI Assistant. The AI Assistant uses embeddings to build and query semantic search indexes, vector stores, and to provide retrieval-augmented generation (RAG) functionality.

## What an embeddings provider does

- Converts input text (or documents) into numeric vectors using an embedding model/service.
- Exposes an implementation that the AI Assistant backend expects so different services can be swapped without changing the rest of the application.
- May include optional helpers for batching, rate limiting, and chunking text before embedding.

## How to wire a provider into your backend

1. Install or include the embeddings provider module into your Backstage backend (see examples below). Each provider in this repository is published as a separate backend module and can be added to the backend with `backend.add(import('...'))`.
2. Configure the provider in `app-config.yaml` under `aiAssistant.embeddings` (example below).
3. Restart the backend so the provider registers and becomes available to the AI Assistant plugin.

### Example: add provider to backend

Update your backend entrypoint (usually `packages/backend/src/index.ts` or similar) and add the provider module import:

```ts
// packages/backend/src/index.ts

// other backend modules...
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add an embeddings provider module (example: Azure OpenAI embeddings provider)
backend.add(
  import(
    '@internal/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
  ),
);
```

Replace the import path above with the provider you want to use.

### Example app-config.yaml

The `aiAssistant.embeddings` section should contain provider-specific configuration. Here are two example configurations.

- Azure OpenAI embeddings provider

```yaml
aiAssistant:
  embeddings:
    azureOpenAI:
      deploymentName: 'text-embedding-3-small'
      instanceName: eastus
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: 'https://eastus.api.cognitive.microsoft.com/openai/deployments/text-embedding-3-large/embeddings?api-version=2023-05-15'
      openAIApiVersion: 2024-12-01-preview
```

These keys and names vary by provider. Consult the provider's README or the module's `README.md` in `plugins/` for exact configuration fields.

## Available providers in this repository

Below are the providers included in this repo (look in the `plugins/` and top-level package directories for backend modules):

| Provider     | Service                              | Local module path                                               |
| ------------ | ------------------------------------ | --------------------------------------------------------------- |
| Azure OpenAI | Azure AI Foundry / OpenAI embeddings | `ai-assistant-backend-module-embeddings-provider-azure-open-ai` |
| Ollama       | Ollama / OpenWebUI self-hosted       | `ai-assistant-backend-module-embeddings-provider-ollama`        |

## Next steps

- See the specific provider READMEs for exact config keys and advanced options. The provider modules live under `plugins/` and top-level packages in this repository.

## Important note about providers and stored vectors

- Only one embeddings provider can be active per Backstage project at a time. The AI Assistant
  expects a single, consistent embedding space for indexing and retrieval.
- If you change embeddings providers or change to a different embeddings model (for example,
  switching from one Azure deployment/model to another, or switching providers entirely), the
  vector representation for your data will change. In that case you must re-ingest / revectorize
  all previously stored data so indexes and vector stores use embeddings produced by the new
  provider/model.

Plan provider changes carefully, and schedule a full revectorization pass when migrating to a
different embeddings model or provider.
