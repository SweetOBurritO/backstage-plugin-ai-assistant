import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { JsonValue } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type CallbackOptions = Record<string, JsonValue> & {
  modelId: string;
  userId: string;
  conversationId: string;
};

export type Callback = {
  metadata: Record<string, JsonValue>;
  callback: BaseCallbackHandler;
};

export type CallbackFactory = (options: CallbackOptions) => Promise<Callback>;
