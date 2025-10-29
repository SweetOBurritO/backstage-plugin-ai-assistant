# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-google-vertex-ai

The model-provider-google-vertex-ai backend module for the Backstage AI Assistant plugin.

This module lets the AI Assistant backend call Google-hosted (GCP) Vertex AI models through a configuration-driven provider so the rest of the plugin remains model-agnostic.

## Features

- Connects Backstage AI Assistant to GCP-hosted Vertex AI LLM models (Vertex AI Studio).
- Configuration via Backstage `app-config.yaml` and environment variables.

## When to use

Use this module when you want the AI Assistant backend to use models hosted in GCP Vertex AI (for example: Gemini-family models
deployed in Google Vertex AI Studio) in the Backstage AI assistant.

## Configuration

Add the provider configuration in your `app-config.local`.

```yaml
aiAssistant:
  models:
    googleVertexAi:
      apiKey: ${VERTEX-AI-API-KEY}
      models:
        - 'gemini-2.5-flash-lite'
```

## Install

Install the plugin into your backstage backend with the following command

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-google-vertex-ai
```

Add it to your backend

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

++backend.add(
++  import(
++    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-google-vertex-ai'
++  ),
++);

```
