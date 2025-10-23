# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama

Ollama model-provider backend module for the Backstage AI Assistant plugin.

This module lets the AI Assistant backend call local or remote Ollama-hosted models through a configuration-driven provider so the rest of the plugin remains model-agnostic.

Key features

- Connect Backstage AI Assistant to Ollama models (local Ollama server or remote Ollama Cloud endpoints).
- Config-driven: supply base URL, API key (if used), and the list of models in your Backstage config.
- Transparent to the rest of the ai-assistant plugin — swap providers via configuration.

When to use

Use this module when you want to host models with Ollama (for example, running LLMs locally with the Ollama server or calling Ollama Cloud) and surface them to the Backstage AI Assistant plugin.

Configuration

Add the provider configuration to your Backstage `app-config.yaml` (or `app-config.local.yaml`). The module expects an `aiAssistant.models.ollama` section with the server base URL, an optional API key, and an array of model names you want to make available.

Example configuration:

```yaml
aiAssistant:
  models:
    ollama:
      baseUrl: http://localhost:11434
      apiKey: ${OLLAMA_API_KEY} # optional, set when your Ollama server or Cloud requires auth
      models:
        - llama2
        - ggml-vicuna
```

Notes on fields

- `baseUrl` — the HTTP endpoint for your Ollama server. Use `http://localhost:11434` for a local Ollama server, or the provided URL for Ollama Cloud. If you use ollama through openwebui the base url is <http://youropenwebuiurl:port/ollama>
- `apiKey` — optional; include it when your Ollama deployment uses API keys. Marked secret in the module's `config.d.ts`.
- `models` — a list of model identifiers that the provider will expose to the ai-assistant backend.

Install

Install the module into your Backstage backend workspace with the following command:

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama
```

Wiring into the backend

Add the module to your Backstage backend in `packages/backend/src/index.ts` (or equivalent) so the AI Assistant backend can discover and use it:

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

+backend.add(
+  import(
+    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama'
+  ),
+);
```
