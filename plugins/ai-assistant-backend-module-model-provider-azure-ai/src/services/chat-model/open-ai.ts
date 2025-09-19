import { CreateChatModelFunction } from '../../types/chat-model';
import { ChatOpenAI } from '@langchain/openai';

export const createOpenAiChatModel: CreateChatModelFunction = options => {
  return new ChatOpenAI({
    configuration: {
      apiKey: options.apiKey,
      baseURL: options.endpoint,
    },
    modelName: options.modelName,
  });
};
