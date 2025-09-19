import { createAzureAiInferenceChatModel } from './azure-ai-inference-chat-model';
import {
  CreateChatModelFunction,
  SdkType,
  CreateChatModelFunctionOptions,
} from '../../types/chat-model';
import { createOpenAiChatModel } from './open-ai';

const chatModels: Record<SdkType, CreateChatModelFunction> = {
  openai: createOpenAiChatModel,
  azureAiInference: createAzureAiInferenceChatModel,
};

export const createChatModeForSdk = (
  sdk: string,
  options: CreateChatModelFunctionOptions,
) => {
  if (!(sdk in chatModels)) {
    throw new Error(`Unsupported SDK type: ${sdk}`);
  }

  return chatModels[sdk as SdkType](options);
};
