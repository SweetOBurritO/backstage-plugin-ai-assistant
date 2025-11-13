# Creating a Callback Provider for AI Assistant

This guide explains how to set up a custom callback provider for the AI Assistant plugin in Backstage, with a focus on integrating LangChain callback handlers.

## Defining a Callback Provider

### Scaffold the module

This example shows how to configure a callback provider for Langfuse, a popular LLM observability platform that provides tracing and monitoring capabilities.

The first thing we should do is create a new [plugin module](https://backstage.io/docs/backend-system/architecture/modules/) plugin.

Run this command and replace `<name>` with the name you want to give your provider. i.e langfuse, langsmith etc

```sh
yarn new --select backend-plugin-module --option pluginId='ai-assistant' --option moduleId=callback-provider-<name>
```

This will scaffold a basic plugin module ready to create the provider logic.

### Define config

Next, we should define config for our callback provider. You should define a new key for your provider under the callbacks key of the assistant config. From here you can define the config as needed for your provider. Langfuse requires an API key (secret key), public key, and base URL to connect to the service.

With this in mind we can define the following config in our `app-config.yaml`

```yaml
aiAssistant:
  callbacks:
    langfuse:
      secretKey: ${LANGFUSE_SECRET_KEY}
      publicKey: ${LANGFUSE_PUBLIC_KEY}
      baseUrl: https://cloud.langfuse.com
```

### Define the config schema

Create a `config.d.ts` file to define the TypeScript types for your configuration. This provides type safety and enables IDE autocomplete for your config:

```ts
// config.d.ts
export interface Config {
  aiAssistant: {
    callbacks: {
      langfuse: {
        baseUrl: string;

        /**
         * @visibility secret
         */
        publicKey: string;

        /**
         * @visibility secret
         */
        secretKey: string;
      };
    };
  };
}
```

Don't forget to reference this in your `package.json`:

```json
{
  "configSchema": "config.d.ts"
}
```

### Creating the callback factory

Now you should define a callback factory that creates callback handlers. The callback factory receives options including `conversationId`, `userId`, and `modelId`, and should return both the callback handler and any metadata you want to pass to the LangChain agent.

For Langfuse, we'll use their LangChain integration packages which provide both OpenTelemetry span processors and LangChain callback handlers.

```ts
// module.ts
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { CallbackHandler } from '@langfuse/langchain';
import { callbackFactoryExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export const aiAssistantModuleCallbackProviderLangfuse = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'callback-provider-langfuse',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        callbackProvider: callbackFactoryExtensionPoint,
      },
      async init({ config, callbackProvider }) {
        // Read configuration
        const secretKey = config.getString(
          'aiAssistant.callbacks.langfuse.secretKey',
        );
        const publicKey = config.getString(
          'aiAssistant.callbacks.langfuse.publicKey',
        );
        const baseUrl = config.getString(
          'aiAssistant.callbacks.langfuse.baseUrl',
        );

        // Initialize Langfuse OpenTelemetry integration
        const langfuseSpanProcessor = new LangfuseSpanProcessor({
          secretKey,
          publicKey,
          baseUrl,
        });

        const sdk = new NodeSDK({
          spanProcessors: [langfuseSpanProcessor],
        });

        sdk.start();

        // Register the callback factory
        callbackProvider.register(async options => {
          const { sessionId, userId, modelId } = options;

          // Create a new callback handler for this conversation
          const callback = new CallbackHandler({
            sessionId: sessionId,
            userId: userId,
            tags: ['backstage-ai-assistant', 'chat', modelId],
          });

          // Return metadata that will be passed to the LangChain agent
          const metadata = {
            langfuseUserId: userId,
            langfuseSessionId: sessionId,
            langfuseTags: ['ai-assistant', 'chat', modelId],
          };

          return {
            callback,
            metadata,
          };
        });
      },
    });
  },
});
```

### Key concepts explained

**Callback Factory**: The function you register receives `CallbackOptions` which includes:

- `sessionId`: The conversation ID
- `userId`: The user's entity reference
- `modelId`: The ID of the model being used
- Any additional custom properties you might need

**Return Value**: Your factory must return an object with:

- `callback`: A LangChain `BaseCallbackHandler` that will receive events
- `metadata`: A record of key-value pairs that gets passed to the LangChain agent execution

**Lifecycle**: A new callback handler is created for each AI interaction, allowing you to scope callbacks per conversation or user.

### Export the module

Create an `index.ts` file to export your module:

```ts
// src/index.ts
export { aiAssistantModuleCallbackProviderLangfuse as default } from './module';
```

## Using your callback provider

At this point your provider is ready to use. You can simply add it to your backend and the callbacks will be automatically invoked during AI interactions.

```diff
// packages/backend/src/index.ts

backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

++backend.add(
++  import(
++    '@internal/backstage-plugin-ai-assistant-backend-module-callback-provider-langfuse'
++  ),
++);
```

## Creating a custom callback provider

If you want to create your own callback provider for a different service or custom logic, follow the same pattern:

1. **Extend BaseCallbackHandler**: Create a class that extends `BaseCallbackHandler` from `@langchain/core/callbacks/base`
2. **Override event methods**: Implement methods like `handleLLMStart`, `handleLLMEnd`, `handleToolStart`, etc.
3. **Register your factory**: Use the `callbackFactoryExtensionPoint` to register your callback factory

Example of a simple custom callback handler:

```ts
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

class CustomCallbackHandler extends BaseCallbackHandler {
  name = 'custom_callback_handler';

  async handleLLMStart(llm: any, prompts: string[]) {
    console.log('LLM started with prompts:', prompts);
  }

  async handleLLMEnd(output: any) {
    console.log('LLM completed with output:', output);
  }

  async handleToolStart(tool: any, input: string) {
    console.log('Tool started:', tool.name, 'with input:', input);
  }

  async handleToolEnd(output: string) {
    console.log('Tool completed with output:', output);
  }
}
```

Then register it in your module:

```ts
callbackProvider.register(async options => {
  const callback = new CustomCallbackHandler();

  return {
    callback,
    metadata: {
      customField: 'customValue',
    },
  };
});
```

## Available callback events

LangChain provides many callback events you can hook into:

- `handleLLMStart` / `handleLLMEnd` - LLM call lifecycle
- `handleLLMNewToken` - Streaming tokens (for streaming responses)
- `handleLLMError` - LLM errors
- `handleChainStart` / `handleChainEnd` - Chain execution
- `handleToolStart` / `handleToolEnd` - Tool invocations
- `handleAgentAction` / `handleAgentEnd` - Agent decisions
- `handleText` - Text events

See the [LangChain callbacks documentation](https://js.langchain.com/docs/concepts/callbacks/) for more details.
