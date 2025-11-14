import {
  CallbackProvider,
  ChainMetadata,
  ChainCallbackOptions,
  ChainCallback,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export type CallbackService = {
  getChainCallbacks: (options: ChainCallbackOptions) => Promise<{
    callbacks: ReturnType<ChainCallback>[];
  }>;

  getChainMetadata: (
    options: ChainCallbackOptions,
  ) => Promise<{ metadata: ChainMetadata }>;

  handleScoreCallbacks: NonNullable<CallbackProvider['scoreCallback']>;
};

export type CreateCallbackServiceOptions = {
  callbacks: CallbackProvider[];
};

export const createCallbackService = async ({
  callbacks,
}: CreateCallbackServiceOptions): Promise<CallbackService> => {
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

  const handleScoreCallbacks: CallbackService['handleScoreCallbacks'] = async ({
    name,
    message,
  }) => {
    callbacks.forEach(async ({ scoreCallback }) => {
      if (!scoreCallback) {
        return;
      }

      scoreCallback({ name, message });
    });
  };

  return {
    getChainCallbacks,
    getChainMetadata,
    handleScoreCallbacks,
  };
};
