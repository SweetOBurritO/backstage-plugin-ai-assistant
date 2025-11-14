import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { CallbackHandler } from '@langfuse/langchain';
import { callbackProviderExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import type { CallbackProvider } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { LangfuseClient } from '@langfuse/client';

const MODULE_ID = 'callback-provider-langfuse';

export const aiAssistantModuleCallbackProviderLangfuse = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: MODULE_ID,
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        callbackProvider: callbackProviderExtensionPoint,
      },
      async init({ config, callbackProvider }) {
        const secretKey = config.getString(
          'aiAssistant.callbacks.langfuse.secretKey',
        );
        const publicKey = config.getString(
          'aiAssistant.callbacks.langfuse.publicKey',
        );
        const baseUrl = config.getString(
          'aiAssistant.callbacks.langfuse.baseUrl',
        );

        const langfuseSpanProcessor = new LangfuseSpanProcessor({
          secretKey,
          publicKey,
          baseUrl,
        });

        const sdk = new NodeSDK({
          spanProcessors: [langfuseSpanProcessor],
        });

        sdk.start();

        const langfuseClient = new LangfuseClient({
          secretKey,
          publicKey,
          baseUrl,
        });

        const chainCallback: NonNullable<
          CallbackProvider['chainCallback']
        > = options => {
          const { modelId, userId, conversationId } = options;

          return new CallbackHandler({
            sessionId: conversationId,
            userId,
            tags: ['backstage-ai-assistant', 'chat', modelId],
          });
        };

        const chainMetadataCallback: NonNullable<
          CallbackProvider['chainMetadataCallback']
        > = async options => {
          const { modelId, userId, conversationId } = options;
          return {
            langfuseUserId: userId,
            langfuseSessionId: conversationId,
            langfuseTags: ['ai-assistant', 'chat', modelId],
          };
        };

        const scoreCallback: NonNullable<
          CallbackProvider['scoreCallback']
        > = async ({ name, message }) => {
          if (!message.traceId) {
            return;
          }

          langfuseClient.score.create({
            traceId: message.traceId,
            name,
            value: message.score,
          });
        };

        callbackProvider.register({
          id: MODULE_ID,
          chainCallback,
          chainMetadataCallback,
          scoreCallback,
        });
      },
    });
  },
});
