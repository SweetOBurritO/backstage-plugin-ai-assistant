import {
  CatalogService,
  catalogServiceRef,
} from '@backstage/plugin-catalog-node';
import {
  SignalsService,
  signalsServiceRef,
} from '@backstage/plugin-signals-node';

import {
  Message,
  EnabledTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

import { getUser } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { v4 as uuid } from 'uuid';
import type {
  BackstageCredentials,
  CacheService,
  UserInfoService,
  AuthService,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import {
  coreServices,
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import { ConversationService, conversationServiceRef } from './conversation';
import { agentServiceRef, AgentService } from './agent';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';

export type ChatServiceOptions = {
  signals: SignalsService;
  catalog: CatalogService;
  cache: CacheService;
  auth: AuthService;
  userInfo: UserInfoService;
  conversation: ConversationService;
  agent: AgentService;
};

type PromptOptions = {
  credentials: BackstageCredentials;
  messages: Message[];
  conversationId: string;
  stream?: boolean;
  tools?: EnabledTool[];
  modelId?: string;
};

export type ChatService = {
  prompt: (options: PromptOptions) => Promise<Message[]>;
};

export const createChatService = async ({
  signals,
  catalog,
  cache,
  auth,
  userInfo,
  conversation,
  agent,
}: ChatServiceOptions): Promise<ChatService> => {
  const contextPromptTemplate = SystemMessagePromptTemplate.fromTemplate(`
    Calling User:
    {user}`);

  const prompt: ChatService['prompt'] = async ({
    conversationId,
    messages,
    stream = true,
    credentials,
    tools: enabledTools,
    modelId,
  }: PromptOptions) => {
    const streamFn = async () => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      const recentConversationMessages =
        await conversation.getRecentConversationMessages({
          conversationId,
          userEntityRef,
          limit: 10,
          excludeRoles: ['tool'],
        });

      const user = await getUser(cache, userEntityRef, catalog, auth);

      const messagesWithoutSystem = messages.filter(m => m.role !== 'system');

      conversation.addMessages(
        messagesWithoutSystem,
        userEntityRef,
        conversationId,
        recentConversationMessages,
      );

      const traceId = uuid();

      const context = await contextPromptTemplate.formatMessages({
        user,
      });

      const responseMessages: Message[] = [];

      const conversationMessages = [...recentConversationMessages, ...messages];

      const newMessages: Message[] = [];

      agent.stream({
        credentials,
        messages: conversationMessages,
        tools: enabledTools,
        modelId,
        metadata: {
          conversationId,
          userId: userEntityRef,
          runName: 'ai-assistant-chat',
          runId: traceId,
        },
        context: context[0].text,
        onStreamChunk: async chunkMessages => {
          if (chunkMessages.length === 0) {
            return;
          }

          const existingNewMessageIndex = newMessages.findIndex(
            cm => cm.id === chunkMessages[0].id,
          );

          if (existingNewMessageIndex !== -1) {
            newMessages.splice(
              existingNewMessageIndex,
              chunkMessages.length,
              ...chunkMessages,
            );
          } else {
            newMessages.push(...chunkMessages);
          }

          responseMessages.push(...chunkMessages);

          signals.publish({
            channel: `ai-assistant.chat.conversation-stream:${conversationId}`,
            message: { messages: chunkMessages },
            recipients: {
              type: 'user',
              entityRef: userEntityRef,
            },
          });
        },
        onStreamEnd: async () => {
          conversation.addMessages(
            newMessages,
            userEntityRef,
            conversationId,
            conversationMessages,
          );
        },
      });

      return responseMessages;
    };

    return stream ? await streamFn() : [];
  };

  return {
    prompt,
  };
};

export const chatServiceRef: ServiceRef<ChatService, 'plugin', 'singleton'> =
  createServiceRef<ChatService>({
    id: 'ai-assistant.chat-service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          cache: coreServices.cache,
          auth: coreServices.auth,
          userInfo: coreServices.userInfo,
          signals: signalsServiceRef,
          catalog: catalogServiceRef,
          conversation: conversationServiceRef,
          agent: agentServiceRef,
        },
        factory: async options => {
          return createChatService(options);
        },
      }),
  });
