# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-callback-provider-langfuse

A callback provider module that integrates Langfuse observability into the Backstage AI Assistant backend, enabling tracing, monitoring, and analytics of LLM interactions.

This README explains how the provider works, when to use it, configuration options, and how to wire it into your Backstage backend.

## Features

- Automatically trace all LLM calls, agent executions, and tool invocations through Langfuse.
- Track token usage, costs, and performance metrics for each conversation.
- Debug AI interactions with detailed execution traces in the Langfuse dashboard.
- Monitor user behavior and conversation patterns across your organization.
- Integrates with both Langfuse Cloud and self-hosted Langfuse instances.
- Uses OpenTelemetry for comprehensive tracing alongside LangChain callbacks.

## When to use

Use this module if you want to:

- Monitor and debug your AI Assistant interactions in production
- Track LLM costs and token usage across models and users
- Analyze conversation patterns and user behavior
- Maintain audit logs of AI interactions for compliance
- Optimize prompts and model performance based on real usage data
- Get visibility into agent decision-making and tool usage

## Configuration

Add the provider configuration to your Backstage `app-config.yaml` or `app-config.local.yaml` under `aiAssistant.callbacks.langfuse`.

Minimum configuration keys (example):

```yaml
aiAssistant:
  callbacks:
    langfuse:
      secretKey: ${LANGFUSE_SECRET_KEY}
      publicKey: ${LANGFUSE_PUBLIC_KEY}
      baseUrl: https://cloud.langfuse.com
```

### Field descriptions

- `secretKey` - Your Langfuse secret API key (starts with `sk-lf-`). Marked as secret in configuration.
- `publicKey` - Your Langfuse public API key (starts with `pk-lf-`). Marked as secret in configuration.
- `baseUrl` - The Langfuse instance URL (e.g., `https://cloud.langfuse.com`, `https://us.cloud.langfuse.com`, or your self-hosted URL)

The exact keys required depend on your Langfuse configuration. Check the provider's `config.d.ts` in the package for the canonical types used by the module.

## Install

Install the module into your Backstage backend workspace:

```sh
yarn workspace backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-callback-provider-langfuse
```

## Wire the provider into your backend

Add the provider module import to your backend entrypoint (usually `packages/backend/src/index.ts`):

```diff
// packages/backend/src/index.ts

// other backend modules...
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add the Langfuse callback provider
++backend.add(
++  import(
++    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-callback-provider-langfuse'
++  ),
++);
```

Restart your backend after adding the provider so it registers with the AI Assistant plugin.

## What gets tracked

The Langfuse callback provider automatically captures:

- **Conversations**: Full conversation history with user and assistant messages
- **Model calls**: All LLM invocations including prompts, completions, and parameters
- **Tool usage**: When agents use tools like search, catalog lookups, or custom tools
- **Token metrics**: Input/output tokens for cost and usage tracking
- **Performance**: Latency and execution time for each operation
- **Errors**: Failed requests with error messages and stack traces
- **Metadata**: User entity references, model IDs, session IDs, and custom tags

## Verification

Once configured and running:

1. Use the AI Assistant in Backstage to ask a question
2. Log in to your Langfuse dashboard
3. Navigate to the **Traces** section
4. You should see traces appearing with tags like `backstage-ai-assistant` and `chat`

Each trace includes:

- User queries and AI responses
- Model calls with prompts and completions
- Token usage and costs
- Tool invocations
- Performance metrics
- User and session information

## Additional Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse Setup Guide for AI Assistant](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/blob/main/docs/langfuse.md)
- [Creating Custom Callback Providers](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/blob/main/docs/callbacks/creating-callback-provider.md)
- [Callback Providers Overview](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/blob/main/docs/callbacks/index.md)
