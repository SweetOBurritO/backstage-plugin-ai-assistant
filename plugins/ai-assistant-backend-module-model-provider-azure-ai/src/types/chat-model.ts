import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type CreateChatModelFunctionOptions = {
  apiKey: string;
  endpoint: string;
  modelName: string;
};

export type CreateChatModelFunction = (
  options: CreateChatModelFunctionOptions,
) => BaseChatModel;

export type SdkType = 'openai' | 'azureAiInference';
