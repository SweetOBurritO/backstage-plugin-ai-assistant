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

        callbackProvider.register(async options => {
          const { conversationId, userEntityRef, modelId } = options;
          const callback = new CallbackHandler({
            sessionId: options.sessionId,
            userId: options.userId,
            tags: ['backstage-ai-assistant', 'chat', options.modelId],
          });

          const metadata = {
            langfuseUserId: userEntityRef,
            langfuseSessionId: conversationId,
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
