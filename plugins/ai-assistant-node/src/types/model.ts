import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type Model = {
  id: string;
  chatModel: BaseChatModel;
};
