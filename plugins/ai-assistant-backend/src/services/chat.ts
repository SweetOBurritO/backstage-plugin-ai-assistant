import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { UserEntity } from '@backstage/catalog-model';
import {
  LoggerService,
  RootConfigService,
  DatabaseService,
  AuthService,
} from '@backstage/backend-plugin-api';
import { ChatStore } from '../database/chat-store';
import {
  Conversation,
  Message,
  JsonObject,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { SignalsService } from '@backstage/plugin-signals-node';
import {
  DEFAULT_FORMATTING_PROMPT,
  DEFAULT_IDENTITY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOL_GUIDELINE,
} from '../constants/prompts';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { createSummarizerService } from './summarizer';
import { CallbackHandler } from '@langfuse/langchain';
import { v4 as uuid } from 'uuid';
import type {
  BackstageCredentials,
  CacheService,
} from '@backstage/backend-plugin-api';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

export type ChatServiceOptions = {
  models: Model[];
  tools: Tool[];
  logger: LoggerService;
  config: RootConfigService;
  database: DatabaseService;
  signals: SignalsService;
  catalog: CatalogService;
  cache: CacheService;
  auth: AuthService;
  langfuseEnabled: boolean;
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
  catalog,
  cache,
  auth,
  langfuseEnabled,
}: ChatServiceOptions): Promise<ChatService> => {
  logger.info(`Available models: ${models.map(m => m.id).join(', ')}`);
  logger.info(`Available tools: ${tools.map(t => t.name).join(', ')}`);

  const identityPrompt =
    config.getOptionalString('aiAssistant.prompt.identity') ||
    DEFAULT_IDENTITY_PROMPT;

  const formattingPrompt =
    config.getOptionalString('aiAssistant.prompt.formatting') ||
    DEFAULT_FORMATTING_PROMPT;

  const contentPrompt =
    config.getOptionalString('aiAssistant.prompt.content') ||
    DEFAULT_SYSTEM_PROMPT;

  const combinedBasePrompt = `${identityPrompt}\n\n${formattingPrompt}\n\n${contentPrompt}`;

  const toolGuideline =
    config.getOptionalString('aiAssistant.prompt.toolGuideline') ||
    DEFAULT_TOOL_GUIDELINE;

  const chatStore = await ChatStore.fromConfig({ database });
  const summarizer = await createSummarizerService({
    config,
    models,
    langfuseEnabled,
  });

  const agentTools = tools.map(tool => new DynamicStructuredTool(tool));

  const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(`
    PURPOSE:
    {basePrompt}

    TOOL USAGE GUIDELINES:
    {toolGuideline}

    Available tools:
    {toolList}

    Calling User:
    {user}

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

    const streamFn = async () => {
      const recentConversationMessages = await chatStore.getChatMessages(
        conversationId,
        userEntityRef,
        10,
        ['tool'],
      );

      const credentials = await auth.getOwnServiceCredentials();
      const user = await getUser(cache, userEntityRef, credentials, catalog);

      addMessages(
        messages,
        userEntityRef,
        conversationId,
        recentConversationMessages,
      );

      const systemPrompt = await systemPromptTemplate.formatMessages({
        basePrompt: combinedBasePrompt,
        toolGuideline,
        toolList: agentTools
          .map(tool => `- ${tool.name}: ${tool.description}`)
          .join('\n'),
        context: `none`,
        user,
      });

      const agent = createReactAgent({
        llm: model,
        tools: agentTools,
        prompt: systemPrompt[0].text,
      });

      // Initialize Langfuse CallbackHandler for tracing if credentials are available
      const langfuseHandler = langfuseEnabled
        ? new CallbackHandler({
            sessionId: conversationId,
            userId: userEntityRef,
            tags: ['backstage-ai-assistant', 'chat'],
          })
        : undefined;

      const promptStream = await agent.stream(
        {
          messages: [...recentConversationMessages, ...messages],
        },
        {
          streamMode: ['values'],
          runName: 'ai-assistant-chat',
          metadata: {
            langfuseUserId: userEntityRef,
            langfuseSessionId: conversationId,
            langfuseTags: ['ai-assistant', 'chat', modelId],
          },
          callbacks: langfuseHandler ? [langfuseHandler] : [],
        },
      );

      const responseMessages: Required<Message>[] = [];

      for await (const [, chunk] of promptStream) {
        const { messages: promptMessages } = chunk;

        const newMessages: Required<Message>[] = promptMessages
          .filter(m => responseMessages.findIndex(rm => rm.id === m.id) === -1)
          .filter(
            m =>
              recentConversationMessages.findIndex(rm => rm.id === m.id) === -1,
          )
          .filter(m => m.getType() !== 'human')
          .map(m => {
            const id = m.id ?? '';
            const role = m.getType();
            const content =
              typeof m.content === 'string'
                ? m.content
                : JSON.stringify(m.content);

            const metadata: JsonObject = {};

            if (role === 'ai') {
              const aiMessage = m as AIMessage;
              metadata.toolCalls = aiMessage.tool_calls || [];
              metadata.finishReason =
                aiMessage.response_metadata.finish_reason || undefined;
              metadata.modelName =
                aiMessage.response_metadata.model_name || undefined;
            }

            if (role === 'tool') {
              const toolMessage = m as ToolMessage;
              metadata.name = toolMessage.name || '';
            }

            return {
              id,
              role,
              content,
              metadata,
            };
          });

        // Simulate streaming until langchain messages error is better understood
        for await (const m of newMessages) {
          const words = m.content.split(' ');
          const chunkSize = 5; // Send 5 words at a time
          let messageBuilder = '';

          for (let i = 0; i < words.length; i += chunkSize) {
            const wordChunk = words.slice(i, i + chunkSize).join(' ');
            messageBuilder = messageBuilder.concat(wordChunk).concat(' ');
            m.content = messageBuilder;

            await new Promise(resolve => setTimeout(resolve, 50));

            signals.publish({
              channel: `ai-assistant.chat.conversation-stream:${conversationId}`,
              message: { messages: [m] },
              recipients: {
                type: 'user',
                entityRef: userEntityRef,
              },
            });
          }
        }

        responseMessages.push(...newMessages);
      }

      addMessages(
        responseMessages.map(m => ({ ...m, id: uuid() })),
        userEntityRef,
        conversationId,
        [...recentConversationMessages, ...messages],
      );

      return responseMessages;
    };

    const result = streamFn();

    return stream ? [] : result;
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

async function getUser(
  cache: CacheService,
  userEntityRef: string,
  credentials: BackstageCredentials,
  catalog: CatalogService,
) {
  const cached = await cache.get(userEntityRef);

  if (cached) {
    return JSON.parse(String(cached));
  }

  const user = (await catalog.getEntityByRef(userEntityRef, {
    credentials,
  })) as UserEntity | undefined;
  await cache.set(userEntityRef, JSON.stringify(user));

  return user;
}
