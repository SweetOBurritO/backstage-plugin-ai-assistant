import {
  CallbackProvider,
  ChainMetadata,
  ChainCallbackOptions,
  ChainCallback,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

import {
  createServiceFactory,
  createServiceRef,
  ServiceRef,
} from '@backstage/backend-plugin-api';

export type CallbackService = {
  getChainCallbacks: (options: ChainCallbackOptions) => Promise<{
    callbacks: ReturnType<ChainCallback>[];
  }>;

  getChainMetadata: (
    options: ChainCallbackOptions,
  ) => Promise<{ metadata: ChainMetadata }>;

  handleScoreCallbacks: NonNullable<CallbackProvider['scoreCallback']>;

  registerCallbacks: (callbacks: CallbackProvider[]) => void;
};

export type CreateCallbackServiceOptions = {};

const createCallbackService =
  async ({}: CreateCallbackServiceOptions): Promise<CallbackService> => {
    const callbacks: CallbackProvider[] = [];

    const getChainCallbacks: CallbackService['getChainCallbacks'] =
      async options => {
        const callbackHandlers: ReturnType<ChainCallback>[] = [];

        for (const { chainCallback } of callbacks) {
          if (!chainCallback) {
            continue;
          }

          const callbackHandler = await chainCallback(options);

          callbackHandlers.push(callbackHandler);
        }

        return {
          callbacks: callbackHandlers,
        };
      };

    const getChainMetadata: CallbackService['getChainMetadata'] =
      async options => {
        const metadata: ChainMetadata = {};

        for (const { chainMetadataCallback } of callbacks) {
          if (!chainMetadataCallback) {
            continue;
          }

          const callbackData = await chainMetadataCallback(options);

          Object.assign(metadata, callbackData.metadata);
        }

        return { metadata };
      };

    const handleScoreCallbacks: CallbackService['handleScoreCallbacks'] =
      async ({ name, message }) => {
        callbacks.forEach(async ({ scoreCallback }) => {
          if (!scoreCallback) {
            return;
          }

          scoreCallback({ name, message });
        });
      };

    const registerCallbacks: CallbackService['registerCallbacks'] =
      newCallbacks => {
        newCallbacks.forEach(callback => {
          callbacks.push(callback);
        });
      };

    return {
      getChainCallbacks,
      getChainMetadata,
      handleScoreCallbacks,
      registerCallbacks,
    };
  };

export const callbackServiceRef: ServiceRef<
  CallbackService,
  'plugin',
  'singleton'
> = createServiceRef<CallbackService>({
  id: 'ai-assistant.callback-service',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {},
      factory: async options => {
        return createCallbackService(options);
      },
    }),
});
