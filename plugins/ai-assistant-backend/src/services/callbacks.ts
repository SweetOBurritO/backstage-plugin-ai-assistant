import {
  Callback,
  CallbackFactory,
  CallbackOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export type CallbackService = {
  getAgentCallbackData: (options: CallbackOptions) => Promise<{
    metadata: Callback['metadata'];
    callbacks: Callback['callback'][];
  }>;
};

export type CreateCallbackServiceOptions = {
  callbacks: CallbackFactory[];
};

export const createCallbackService = async ({
  callbacks,
}: CreateCallbackServiceOptions): Promise<CallbackService> => {
  const getAgentCallbackData: CallbackService['getAgentCallbackData'] =
    async options => {
      const metadata = {};
      const callbackHandlers: Callback['callback'][] = [];

      for (const createCallback of callbacks) {
        const { metadata: cbMetadata, callback } = await createCallback(
          options,
        );
        Object.assign(metadata, cbMetadata);
        callbackHandlers.push(callback);
      }

      return {
        metadata,
        callbacks: callbackHandlers,
      };
    };

  return {
    getAgentCallbackData,
  };
};
