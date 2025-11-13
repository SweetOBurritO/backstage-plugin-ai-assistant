# What is a Callback Provider?

A **callback provider** is a [plugin module](https://backstage.io/docs/backend-system/architecture/modules/) that supplies callback handlers to the AI Assistant plugin. Each provider registers a callback factory that implements the required interface, making callback handlers available for use during AI interactions.

## Understanding LangChain Callbacks

The AI Assistant plugin is built around the [langchain](https://js.langchain.com/docs/introduction/) ecosystem. LangChain [callbacks](https://js.langchain.com/docs/concepts/callbacks/) are event handlers that get triggered at various points during the execution of LLM chains, agents, and tools.

When an AI interaction happens, LangChain fires events at key moments:

- When an LLM call starts and completes
- When a tool is invoked and returns
- When a chain begins and ends
- When errors occur
- When tokens are generated (for streaming)

Callback handlers listen for these events and can execute custom logic - like logging to a file, sending data to a tracing platform, updating metrics, or triggering other actions.

Any callback you provide in your callback provider should extend the [BaseCallbackHandler](https://js.langchain.com/docs/concepts/callbacks/) provided by `@langchain/core` or implement a compatible callback handler from the langchain ecosystem.

This allows for a standard callback interface to be used by the AI assistant to hook into the langchain execution lifecycle, enabling various integrations like logging, tracing, monitoring, or custom event handling

## Using a callback provider

- Select a provider from the list below
- Add the provider to your backend

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

++backend.add(
++  import(
++    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-callback-provider-langfuse'
++  ),
++);

```

- Update your `app-config.yaml` with the required config of the provider

```yaml
aiAssistant:
  callbacks:
    langfuse:
      secretKey: ${LANGFUSE_SECRET_KEY}
      publicKey: ${LANGFUSE_PUBLIC_KEY}
      baseUrl: https://cloud.langfuse.com
```

## Available Providers

| Name     | Service                                      | Link to Provider                                                                                                                                                | Documentation                                                                         |
| -------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Langfuse | [Langfuse](https://langfuse.com/)            | [Github](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/tree/main/plugins/ai-assistant-backend-module-callback-provider-langfuse)               | [Setup Guide](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/blob/main/docs/langfuse.md) |

## Why use callback providers?

Callback providers allow you to tap into the AI execution lifecycle without modifying core code. Common use cases include:

- **Observability Platforms**: Send traces to Langfuse, LangSmith, or other LLM observability tools to visualize and debug AI interactions
- **Custom Logging**: Log LLM calls, prompts, responses, and errors to your own logging infrastructure
- **Cost Tracking**: Monitor token usage across models to track and optimize costs
- **Performance Monitoring**: Measure latency and performance of LLM calls and agent executions
- **Analytics**: Capture conversation data for analysis, model comparison, or training data
- **Compliance & Auditing**: Record AI interactions for regulatory compliance or security audits
- **Real-time Notifications**: Trigger alerts when errors occur or specific patterns are detected
- **Custom Integrations**: Build your own handlers for specialized workflows or business logic

Without callbacks, you'd need to modify the core AI Assistant code to add these capabilities. Callback providers make it plug-and-play.
