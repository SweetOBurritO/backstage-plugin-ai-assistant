import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  LoggerService,
  RootConfigService,
  DatabaseService,
} from '@backstage/backend-plugin-api';
import { ChatStore } from '../database/chat-store';
import {
  Conversation,
  Message,
  JsonObject,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { SignalsService } from '@backstage/plugin-signals-node';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOL_GUIDELINE,
} from '../constants/prompts';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { createSummarizerService } from './summarizer';
import { v4 as uuid } from 'uuid';
import { ToolMessage } from '@langchain/core/messages';

export type ChatServiceOptions = {
  models: Model[];
  tools: Tool[];
  logger: LoggerService;
  config: RootConfigService;
  database: DatabaseService;
  signals: SignalsService;
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

type GetConversationsOptions = {
  userEntityRef: string;
};

export type ChatService = {
  prompt: (options: PromptOptions) => Promise<Required<Message>[]>;
  getAvailableModels: () => Promise<string[]>;
  getConversation: (
    options: GetConversationOptions,
  ) => Promise<Required<Message>[]>;
  getConversations: (
    options: GetConversationsOptions,
  ) => Promise<Conversation[]>;
  addMessages: (
    messages: Message[],
    userRef: string,
    conversationId: string,
    recentConversationMessages?: Message[],
  ) => Promise<void>;
};

export const createChatService = async ({
  models,
  tools,
  logger,
  database,
  signals,
  config,
}: ChatServiceOptions): Promise<ChatService> => {
  logger.info(`Available models: ${models.map(m => m.id).join(', ')}`);

  const system =
    config.getOptionalString('aiAssistant.prompt.system') ||
    DEFAULT_SYSTEM_PROMPT;

  const toolGuideline =
    config.getOptionalString('aiAssistant.prompt.toolGuideline') ||
    DEFAULT_TOOL_GUIDELINE;

  const chatStore = await ChatStore.fromConfig({ database });
  const summarizer = await createSummarizerService({ config, models });

  const agentTools = tools.map(tool => new DynamicStructuredTool(tool));

  const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(`
    PURPOSE:
    {basePrompt}

    TOOL USAGE GUIDELINES:
    {toolGuideline}

    Available tools:
    {toolList}

    Context:
    {context}`);

  const addMessages: ChatService['addMessages'] = async (
    messages,
    userRef,
    conversationId,
    recentConversationMessages,
  ) => {
    // If we have recentConversationMessages, use them; otherwise, fetch the last 5 messages
    const recentMessages =
      recentConversationMessages ||
      (await chatStore.getChatMessages(conversationId, userRef, 5, ['tool']));

    const conversationSize = (recentMessages?.length ?? 0) + messages.length;

    if (recentMessages.length === 0) {
      const conversation: Conversation = {
        id: conversationId,
        title: 'New Conversation',
        userRef,
      };
      chatStore.createConversation(conversation);
      chatStore.addChatMessage(messages, userRef, conversationId);

      signals.publish({
        channel: `ai-assistant.chat.conversation-details-update`,
        message: { conversation },
        recipients: {
          type: 'user',
          entityRef: userRef,
        },
      });
      return;
    }

    if (conversationSize < 5) {
      chatStore.addChatMessage(messages, userRef, conversationId);
      return;
    }

    const conversation = await chatStore.getConversation(
      conversationId,
      userRef,
    );

    if (conversation.title !== 'New Conversation') {
      chatStore.addChatMessage(messages, userRef, conversationId);
      return;
    }

    const summary = await summarizer.summarize(recentMessages, '25 characters');

    conversation.title = summary;

    chatStore.updateConversation(conversation);
    chatStore.addChatMessage(messages, userRef, conversationId);

    signals.publish({
      channel: `ai-assistant.chat.conversation-details-update`,
      message: { conversation },
      recipients: {
        type: 'user',
        entityRef: userRef,
      },
    });
  };

  const prompt: ChatService['prompt'] = async ({
    conversationId,
    messages,
    modelId,
    stream = true,
    userEntityRef,
  }: PromptOptions) => {
    const model = models.find(m => m.id === modelId)?.chatModel;

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    const aiMessage: Required<Message> = {
      id: uuid(),
      role: 'ai',
      content: '',
      metadata: {},
    };

    const streamFn = async () => {
      const recentConversationMessages = await chatStore.getChatMessages(
        conversationId,
        userEntityRef,
        10,
        ['tool'],
      );

      const systemPrompt = await systemPromptTemplate.formatMessages({
        basePrompt: system,
        toolGuideline,
        toolList: agentTools
          .map(tool => `- ${tool.name}: ${tool.description}`)
          .join('\n'),
        context: `none`,
      });

      const agent = createReactAgent({
        llm: model,
        tools: agentTools,
        prompt: systemPrompt[0].text,
      });

      const promptStream = await agent.stream(
        {
          messages: [...recentConversationMessages, ...messages],
        },
        { streamMode: 'messages' },
      );

      const responseMessages: Required<Message>[] = [];
      let firstMessageId: string | undefined;

      for await (const [
        message,
        { __pregel_task_id: messageId },
      ] of promptStream) {
        if (!firstMessageId) {
          firstMessageId = messageId;
        }

        const id = messageId === firstMessageId ? aiMessage.id : messageId;

        const index = responseMessages.findIndex(m => m.id === id);
        const role = message.getType();

        if (index === -1) {
          const content =
            typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content);

          const toolName =
            role === 'tool' ? (message as ToolMessage).name : undefined;
          const metadata: JsonObject = {};

          if (toolName) {
            metadata.name = toolName;
          }

          responseMessages.push({
            role,
            content,
            id,
            metadata,
          });
        }

        if (index !== -1) {
          responseMessages[index] = {
            ...responseMessages[index],
            content: (responseMessages[index].content += message.content),
          };
        }

        signals.publish({
          channel: `ai-assistant.chat.conversation-stream:${conversationId}`,
          message: { messages: responseMessages.filter(m => m.content) },
          recipients: {
            type: 'user',
            entityRef: userEntityRef,
          },
        });
      }

      addMessages(
        [...messages, ...responseMessages],
        userEntityRef,
        conversationId,
        recentConversationMessages,
      );

      return responseMessages;
    };

    const result = streamFn();

    return stream ? [aiMessage] : result;
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

  const getConversations: ChatService['getConversations'] = async ({
    userEntityRef,
  }: GetConversationsOptions) => {
    const conversations = await chatStore.getConversations(userEntityRef);

    return conversations;
  };
  return {
    prompt,
    getAvailableModels,
    getConversation,
    getConversations,
    addMessages,
  };
};
