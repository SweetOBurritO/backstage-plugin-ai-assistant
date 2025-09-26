import {
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
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { SignalsService } from '@backstage/plugin-signals-node';
import { DEFAULT_SUMMARY_PROMPT } from '../constants/prompts';

export type ChatServiceOptions = {
  models: Model[];
  logger: LoggerService;
  vectorStore: VectorStore;
  config: RootConfigService;
  promptBuilder: PromptBuilder;
  database: DatabaseService;
  signals: SignalsService;
};

type StreamOptions = {
  modelId: string;
  messages: Message[];
  messageId: string;
  userEntityRef: string;
};

type PromptOptions = {
  modelId: string;
  messages: Message[];
  conversationId: string;
  stream?: boolean;
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
  signals,
  config,
}: ChatServiceOptions): Promise<ChatService> => {
  logger.info(`Available models: ${models.map(m => m.id).join(', ')}`);

  const chatStore = await ChatStore.fromConfig({ database });

  const getChatModelById = (id: string) => {
    return models.find(model => model.id === id)?.chatModel;
  };

  const streamMessage = async ({
    modelId,
    messages,
    messageId,
    userEntityRef,
  }: StreamOptions) => {
    const model = getChatModelById(modelId);

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    const promptStream = await model.stream(messages);

    const aiMessage: Required<Message> = {
      id: messageId,
      role: 'assistant',
      content: '',
    };

    for await (const chunk of promptStream) {
      aiMessage.content += chunk.content ?? '';

      chatStore.updateMessage(aiMessage);

      signals.publish({
        channel: `ai-assistant.chat.message-stream:${messageId}`,
        message: aiMessage,
        recipients: {
          type: 'user',
          entityRef: userEntityRef,
        },
      });
    }
  };

  const addChatMessage: (typeof chatStore)['addChatMessage'] = async (
    messages,
    userRef,
    conversationId,
  ) => {
    const conversationSize = await chatStore.getConversationSize(
      conversationId,
    );

    if (conversationSize < 1) {
      await chatStore.createConversation({
        id: conversationId,
        userRef,
        title: 'New Conversation',
      });

      await chatStore.addChatMessage(messages, userRef, conversationId);
      return;
    }

    const conversation = await chatStore.getConversation(
      conversationId,
      userRef,
    );

    if (conversationSize + messages.length < 5) {
      await chatStore.addChatMessage(messages, userRef, conversationId);
      return;
    }

    if (conversation.title !== 'New Conversation') {
      await chatStore.addChatMessage(messages, userRef, conversationId);
      return;
    }

    const summaryModelId =
      config.getOptionalString('aiAssistant.conversation.summaryModel') ??
      models[0].id;
    const summaryModel = getChatModelById(summaryModelId);

    if (!summaryModel) {
      throw new Error(`Model with id ${summaryModelId} not found`);
    }

    const conversationMessages = await chatStore.getChatMessages(
      conversationId,
      userRef,
      5,
    );

    const summaryPrompt =
      config.getOptionalString('aiAssistant.conversation.summaryPrompt') ??
      DEFAULT_SUMMARY_PROMPT;

    const { text } = await summaryModel.invoke([
      ...conversationMessages,
      {
        role: 'system',
        content: summaryPrompt,
      },
    ]);

    conversation.title = text.trim();

    await chatStore.updateConversation(conversation);
    await chatStore.addChatMessage(messages, userRef, conversationId);
  };

  const prompt: ChatService['prompt'] = async ({
    conversationId,
    messages,
    modelId,
    stream = true,
    userEntityRef,
  }: PromptOptions) => {
    const model = getChatModelById(modelId);

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    await addChatMessage(messages, userEntityRef, conversationId);

    console.log('after chat messagr add');

    const context = await vectorStore.similaritySearch(
      messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n'),
    );

    console.log('after similarity search');

    const recentConversationMessages = await chatStore.getChatMessages(
      conversationId,
      userEntityRef,
      10,
    );

    console.log('after get chat messages');

    const promptMessages = promptBuilder.buildPrompt(
      [...recentConversationMessages, ...messages],
      context,
    );

    const messageId: string = uuid();

    const aiMessage: Required<Message> = {
      id: messageId,
      role: 'assistant',
      content: '',
    };

    await addChatMessage([aiMessage], userEntityRef, conversationId);

    if (stream) {
      streamMessage({
        modelId,
        messages: promptMessages,
        messageId,
        userEntityRef,
      });

      return [aiMessage];
    }
    const { text } = await model.invoke(promptMessages);

    aiMessage.content = text;

    await chatStore.updateMessage(aiMessage);

    return [aiMessage];
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
