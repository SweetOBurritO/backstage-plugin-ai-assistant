import {
  coreServices,
  createServiceFactory,
  createServiceRef,
  DatabaseService,
  ServiceRef,
} from '@backstage/backend-plugin-api';

import { ChatStore } from '../database/chat-store';
import {
  Conversation,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { v4 as uuid } from 'uuid';
import { CallbackService, callbackServiceRef } from './callbacks';

import {
  SignalsService,
  signalsServiceRef,
} from '@backstage/plugin-signals-node';
import { SummarizerService, summarizerServiceRef } from './summarizer';

export type ConversationService = {
  getConversation: (options: {
    conversationId: string;
    userEntityRef: string;
  }) => Promise<Message[]>;
  getConversations: (options: {
    userEntityRef: string;
  }) => Promise<Conversation[]>;
  addMessages: (
    messages: Message[],
    userRef: string,
    conversationId: string,
    recentConversationMessages?: Message[],
  ) => Promise<void>;
  scoreMessage: (messageId: string, score: number) => Promise<void>;
  getRecentConversationMessages: (options: {
    conversationId: string;
    userEntityRef: string;
    limit?: number;
    excludeRoles?: Message['role'][];
  }) => Promise<Message[]>;
  createConversationShare: (options: {
    conversationId: string;
    userEntityRef: string;
  }) => Promise<string>;
  importSharedConversation: (options: {
    shareId: string;
    userEntityRef: string;
  }) => Promise<string>;
};

export type CreateConversationServiceOptions = {
  database: DatabaseService;
  callback: CallbackService;
  signals: SignalsService;
  summarizer: SummarizerService;
};

const createConversationService = async ({
  database,
  callback,
  signals,
  summarizer,
}: CreateConversationServiceOptions): Promise<ConversationService> => {
  const chatStore = await ChatStore.fromConfig({ database });

  const getConversation: ConversationService['getConversation'] =
    async options => {
      const { conversationId, userEntityRef } = options;

      const conversation = await chatStore.getChatMessages(
        conversationId,
        userEntityRef,
      );

      return conversation;
    };

  const getConversations: ConversationService['getConversations'] = async ({
    userEntityRef,
  }) => {
    const conversations = await chatStore.getConversations(userEntityRef);

    return conversations;
  };

  const scoreMessage: ConversationService['scoreMessage'] = async (
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

  const getRecentConversationMessages: ConversationService['getRecentConversationMessages'] =
    async ({ conversationId, userEntityRef, excludeRoles, limit }) => {
      const recentConversationMessages = await chatStore.getChatMessages(
        conversationId,
        userEntityRef,
        limit,
        excludeRoles,
      );

      return recentConversationMessages;
    };

  const addMessages: ConversationService['addMessages'] = async (
    messages,
    userRef,
    conversationId,
    recentConversationMessages,
  ) => {
    // If we have recentConversationMessages, use them; otherwise, fetch the last 5 messages
    const recentMessages =
      recentConversationMessages ||
      (await getRecentConversationMessages({
        conversationId,
        userEntityRef: userRef,
        limit: 5,
        excludeRoles: ['tool'],
      }));

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

  const createConversationShare: ConversationService['createConversationShare'] =
    async ({ conversationId, userEntityRef }) => {
      await chatStore.getConversation(conversationId, userEntityRef);

      const shareId = uuid();

      await chatStore.createSharedConversation({
        id: shareId,
        conversationId,
      });

      return shareId;
    };

  const importSharedConversation: ConversationService['importSharedConversation'] =
    async ({ shareId, userEntityRef }) => {
      const sharedConversation = await chatStore.getSharedConversation(shareId);

      if (!sharedConversation) {
        throw new Error('Shared conversation not found');
      }

      const sourceConversation = await chatStore.getConversationById(
        sharedConversation.conversationId,
      );

      if (!sourceConversation) {
        throw new Error('Original conversation not found');
      }

      const sourceMessages = await chatStore.getChatMessagesForConversation(
        sourceConversation.id,
        sharedConversation.createdAt,
      );

      const newConversationId = uuid();
      const copiedMessages: Message[] = sourceMessages.map(message => ({
        id: uuid(),
        role: message.role,
        content: message.content,
        metadata: message.metadata,
        score: message.score,
        traceId: message.traceId,
      }));

      await chatStore.createConversation({
        id: newConversationId,
        userRef: userEntityRef,
        title: sourceConversation.title,
      });

      if (copiedMessages.length > 0) {
        await chatStore.addChatMessage(copiedMessages, userEntityRef, newConversationId);
      }

      return newConversationId;
    };

  return {
    getConversation,
    getConversations,
    addMessages,
    scoreMessage,
    getRecentConversationMessages,
    createConversationShare,
    importSharedConversation,
  };
};

export const conversationServiceRef: ServiceRef<
  ConversationService,
  'plugin',
  'singleton'
> = createServiceRef<ConversationService>({
  id: 'ai-assistant.conversation-service',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        database: coreServices.database,
        callback: callbackServiceRef,
        signals: signalsServiceRef,
        summarizer: summarizerServiceRef,
      },
      factory: async options => {
        return createConversationService(options);
      },
    }),
});
