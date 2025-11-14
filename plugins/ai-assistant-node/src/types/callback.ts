import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import {
  JsonValue,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type ChainCallbackOptions = Record<string, JsonValue> & {
  modelId: string;
  userId: string;
  conversationId: string;
};

export type ChainCallback = (
  options: ChainCallbackOptions,
) => BaseCallbackHandler;

export type ScoreCallback = (options: {
  name: string;
  message: Message;
}) => Promise<void>;

export type ChainMetadata = Record<string, JsonValue>;

export type ChainMetadataCallback = (
  options: ChainCallbackOptions,
) => Promise<ChainMetadata>;

export type CallbackProvider = {
  id: string;
  chainCallback?: ChainCallback;
  scoreCallback?: ScoreCallback;
  chainMetadataCallback?: ChainMetadataCallback;
};
