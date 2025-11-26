import { CatalogService } from '@backstage/plugin-catalog-node';
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
  Tool,
  UserTool,
  EnabledTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { SignalsService } from '@backstage/plugin-signals-node';
import {
  DEFAULT_FORMATTING_PROMPT,
  DEFAULT_IDENTITY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOL_GUIDELINE,
} from '../constants/prompts';
import {
  Model,
  getUser,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { SummarizerService } from './summarizer';
import { v4 as uuid } from 'uuid';
import type {
  BackstageCredentials,
  CacheService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { McpService } from './mcp';
import { CallbackService } from './callbacks';

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
  mcp: McpService;
  userInfo: UserInfoService;
  callback: CallbackService;
  summarizer: SummarizerService;
};

type PromptOptions = {
  modelId: string;
  messages: Message[];
  conversationId: string;
  stream?: boolean;
  userCredentials: BackstageCredentials;
  tools?: EnabledTool[];
};

type GetConversationOptions = {
  conversationId: string;
  userEntityRef: string;
};

type GetConversationsOptions = {
  userEntityRef: string;
};

// Helper type for messages with required fields except traceId which remains optional
type MessageWithRequiredFields = Required<Omit<Message, 'traceId'>> &
  Pick<Message, 'traceId'>;

export type ChatService = {
  prompt: (options: PromptOptions) => Promise<MessageWithRequiredFields[]>;
  getAvailableModels: () => Promise<string[]>;
  getConversation: (
    options: GetConversationOptions,
  ) => Promise<MessageWithRequiredFields[]>;
  getConversations: (
    options: GetConversationsOptions,
  ) => Promise<Conversation[]>;
  addMessages: (
    messages: Message[],
    userRef: string,
    conversationId: string,
    recentConversationMessages?: Message[],
  ) => Promise<void>;
  scoreMessage: (messageId: string, score: number) => Promise<void>;
  getAvailableTools: (options: {
    credentials: BackstageCredentials;
  }) => Promise<UserTool[]>;
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
  mcp,
  userInfo,
  callback,
  summarizer,
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

    const summary = await summarizer.summarizeConversation({
      messages: recentMessages,
      length: '25 characters',
    });

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
    userCredentials,
    tools: enabledTools,
  }: PromptOptions) => {
    const model = models.find(m => m.id === modelId)?.chatModel;

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    const { userEntityRef } = await userInfo.getUserInfo(userCredentials);

    const streamFn = async () => {
      const recentConversationMessages = await chatStore.getChatMessages(
        conversationId,
        userEntityRef,
        10,
        ['tool'],
      );

      const credentials = await auth.getOwnServiceCredentials();
      const user = await getUser(cache, userEntityRef, credentials, catalog);

      const mcpTools = await mcp.getTools(userCredentials);

      const agentTools = [...tools, ...mcpTools]
        .filter(tool => {
          // If tools parameter is undefined, allow all tools
          if (enabledTools === undefined) return true;

          // If empty array, no tools should be enabled
          if (enabledTools.length === 0) return false;
          // Otherwise, only allow tools that are in the enabled list
          const enabled = enabledTools.find(
            enabledTool =>
              enabledTool.name === tool.name &&
              enabledTool.provider === tool.provider,
          );
          return !!enabled;
        })
        .map(tool => new DynamicStructuredTool(tool));

      const messagesWithoutSystem = messages.filter(m => m.role !== 'system');

      addMessages(
        messagesWithoutSystem,
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

      const { callbacks } = await callback.getChainCallbacks({
        conversationId,
        userId: userEntityRef,
        modelId,
      });

      const { metadata: promptMetadata } = await callback.getChainMetadata({
        conversationId,
        userId: userEntityRef,
        modelId,
      });

      const traceId = uuid();

      const promptStream = await agent.stream(
        {
          messages: [...recentConversationMessages, ...messages],
        },
        {
          streamMode: ['values'],
          runName: 'ai-assistant-chat',
          runId: traceId,
          metadata: promptMetadata,
          callbacks,
        },
      );

      const responseMessages: MessageWithRequiredFields[] = [];

      for await (const [, chunk] of promptStream) {
        const { messages: promptMessages } = chunk;

        const newMessages: MessageWithRequiredFields[] = promptMessages
          .filter(
            m =>
              responseMessages.findIndex(
                rm => m.id === rm.metadata.langGraphId,
              ) === -1,
          )
          .filter(
            m =>
              recentConversationMessages.findIndex(rm => rm.id === m.id) === -1,
          )
          .filter(m => m.getType() !== 'human')
          .map(m => {
            const id = uuid();
            const role = m.getType();
            const content =
              typeof m.content === 'string'
                ? m.content
                : JSON.stringify(m.content);

            const metadata: JsonObject = {
              langGraphId: m.id ?? '',
            };

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
              score: 0,
              traceId: traceId,
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

      addMessages(responseMessages, userEntityRef, conversationId, [
        ...recentConversationMessages,
        ...messages,
      ]);

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

  const scoreMessage: ChatService['scoreMessage'] = async (
    messageId: string,
    score: number,
  ) => {
    const message = await chatStore.getMessageById(messageId);

    if (!message) {
      throw new Error(`Message with id ${messageId} not found`);
    }

    const updatedMessage: Required<Message> = {
      ...message,
      score,
    };

    chatStore.updateMessage(updatedMessage);

    callback.handleScoreCallbacks({
      name: 'helpfulness',
      message: updatedMessage,
    });
  };

  const getAvailableTools: ChatService['getAvailableTools'] = async ({
    credentials,
  }) => {
    const mcpTools = await mcp.getTools(credentials);

    const availableTools: UserTool[] = tools.concat(mcpTools).map(tool => ({
      name: tool.name,
      provider: tool.provider ?? 'unknown',
      description: tool.description,
    }));

    return availableTools;
  };

  return {
    prompt,
    getAvailableModels,
    getConversation,
    getConversations,
    addMessages,
    scoreMessage,
    getAvailableTools,
  };
};
