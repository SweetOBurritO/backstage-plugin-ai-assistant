import {
  Message,
  Model,
  VectorStore,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  LoggerService,
  RootConfigService,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { PromptBuilder } from './prompt';
import { v4 as uuid } from 'uuid';
import { ChatStore } from '../database/chat-store';

export type ChatServiceOptions = {
  models: Model[];
  logger: LoggerService;
  vectorStore: VectorStore;
  config: RootConfigService;
  promptBuilder: PromptBuilder;
  database: DatabaseService;
};

type PromptOptions = {
  modelId: string;
  messages: Message[];
  conversationId: string;
  stream: boolean;
  userEntityRef: string;
};

type GetConversationOptions = {
  conversationId: string;
  userEntityRef: string;
};

export type ChatService = {
  prompt: (options: PromptOptions) => Promise<Required<Message>[]>;
  getAvailableModels: () => Promise<string[]>;
  getConversation: (
    options: GetConversationOptions,
  ) => Promise<Required<Message>[]>;
};

export const createChatService = async ({
  models,
  logger,
  vectorStore,
  promptBuilder,
  database,
}: ChatServiceOptions): Promise<ChatService> => {
  logger.info(`Available models: ${models.map(m => m.id).join(', ')}`);

  const chatStore = await ChatStore.fromConfig({ database });

  const getChatModelById = (id: string) => {
    return models.find(model => model.id === id)?.chatModel;
  };

  const prompt: ChatService['prompt'] = async ({
    conversationId,
    messages,
    modelId,
    stream,
    userEntityRef,
  }: PromptOptions) => {
    const model = getChatModelById(modelId);

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    chatStore.addChatMessage(messages, userEntityRef, conversationId);

    const context = await vectorStore.similaritySearch(
      messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n'),
    );

    const recentConversationMessages = await chatStore.getChatMessages(
      conversationId,
      userEntityRef,
      10,
    );

    const promptMessages = promptBuilder.buildPrompt(
      [...recentConversationMessages, ...messages],
      context,
    );

    const responseId: string = uuid();

    if (stream) {
      // Handle streaming response
      throw new Error('Not Implemented');
    }

    const response = await model.invoke(promptMessages);

    const aiMessages: Required<Message>[] = [
      {
        id: responseId,
        role: 'assistant',
        content: response.text,
      },
    ];

    chatStore.addChatMessage(aiMessages, userEntityRef, conversationId);

    return aiMessages;
  };

  const getAvailableModels: ChatService['getAvailableModels'] = async () => {
    return models.map(x => x.id);
  };

  const getConversation: ChatService['getConversation'] = async (
    options: GetConversationOptions,
  ) => {
    const { conversationId, userEntityRef } = options;

    const conversation = await chatStore.getChatMessages(
      conversationId,
      userEntityRef,
    );

    return conversation;
  };

  return {
    prompt,
    getAvailableModels,
    getConversation,
  };
};
