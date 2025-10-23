# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama

An embeddings provider module that lets the Backstage AI Assistant backend create vector
embeddings using Ollama-hosted models (local Ollama server or Ollama Cloud).

This README explains how the provider works, when to use it, configuration options, and how
to wire it into your Backstage backend.

## Features

- Convert text or documents to numeric vector embeddings using an Ollama model.
- Exposes a provider implementation compatible with the AI Assistant backend so different
 embeddings services can be swapped without changing the rest of the app.
- Minimal configuration for local or remote Ollama endpoints and optional API key support.

## When to use

Use this module when you run an Ollama embeddings-capable model and want the AI Assistant to
build semantic search indices, vector stores, or provide retrieval-augmented generation (RAG)
capabilities in Backstage. It's a good fit for local development with Ollama or when using an
Ollama-hosted endpoint.

## Configuration

Add the provider configuration to your Backstage `app-config.yaml` or `app-config.local.yaml`
under `aiAssistant.embeddings.ollama`.

Minimum configuration keys (example):

```yaml
aiAssistant:
  embeddings:
    ollama:
        baseUrl: 'http://localhost:11434'
        model: 'text-embedding-3-small'
        apiKey: ${OLLAMA_API_KEY}
```

Field descriptions:

- `baseUrl` - The base URL of your Ollama service. For a local Ollama server this is typically
 `http://localhost:11434`. For Ollama Cloud or a proxied endpoint, use the full base URL. For ollama with webui you must set the base url to the `/ollama` route. i.e `http://localhost:11434/ollama`
- `model` - The name of the model to use for generating embeddings. The model must support
 embeddings (check your Ollama model documentation for supported capabilities).
- `apiKey` - (Optional) An API key for Ollama Cloud or any endpoint that requires authentication.
 Mark this value as secret in Backstage configuration when applicable.

The exact keys available and required depend on your Ollama setup. Check the provider's
`config.d.ts` in the package for the canonical types used by the module.

## Install

Install the module into your Backstage backend workspace:

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama
```

## Wire the provider into your backend

Add the provider module import to your backend entrypoint (usually `packages/backend/src/index.ts`):

```diff
// packages/backend/src/index.ts

// other backend modules...
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add the Ollama embeddings provider
++backend.add(
++  import(
++    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama'
++  ),
++);
```

Restart your backend after adding the provider so it registers with the AI Assistant plugin.
