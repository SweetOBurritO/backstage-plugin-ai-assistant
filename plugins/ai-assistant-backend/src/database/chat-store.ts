import { DatabaseService } from '@backstage/backend-plugin-api';
import {
  Message,
  Conversation,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

import { Knex } from 'knex';

const MESSAGE_TABLE_NAME = 'message';
const CONVERSATION_TABLE_NAME = 'conversation';

export type ChatStoreOptions = {
  database: DatabaseService;
};

export class ChatStore {
  /**
   * Creates an instance of ChatStore.
   * @param client - The Knex client to interact with the PostgreSQL database.
   */
  constructor(private readonly client: Knex) {}

  static async fromConfig({ database }: ChatStoreOptions) {
    const client = await database.getClient();
    return new ChatStore(client);
  }

  messageTable() {
    return this.client(MESSAGE_TABLE_NAME);
  }

  conversationTable() {
    return this.client(CONVERSATION_TABLE_NAME);
  }

  async getChatMessages(
    conversationId: string,
    userRef: string,
    limit?: number,
    excludeRoles?: Message['role'][],
  ): Promise<Required<Message>[]> {
    let query = this.messageTable()
      .where({ conversation_id: conversationId, userRef })
      .select('*')
      .orderBy('created_at', 'asc');

    if (typeof limit === 'number') {
      query = query.limit(limit).orderBy('created_at', 'desc');
    }

    if (excludeRoles && excludeRoles.length > 0) {
      query = query.whereNotIn('role', excludeRoles);
    }

    const rows = await query;

    const chatMessages: Required<Message>[] = rows.map(row => ({
      role: row.role,
      content: row.content,
      id: row.id,
      metadata: row.metadata,
      score: row.score,
      traceId: row.trace_id,
    }));

    return chatMessages;
  }

  async addChatMessage(
    messages: Message[],
    userRef: string,
    conversationId: string,
  ): Promise<void> {
    const rows = messages.map(msg => ({
      id: msg.id,
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      trace_id: msg.traceId,
      userRef,
      created_at: this.client.fn.now(),
    }));

    await this.messageTable().insert(rows);
  }

  async updateMessage(message: Required<Message>) {
    await this.messageTable().where({ id: message.id }).update({
      role: message.role,
      content: message.content,
      metadata: message.metadata,
      score: message.score,
      trace_id: message.traceId,
    });
  }

  async getConversation(
    conversationId: string,
    userRef: string,
  ): Promise<Conversation> {
    const row = await this.conversationTable()
      .where({ id: conversationId, userRef })
      .first();

    if (!row) {
      throw new Error('Conversation not found');
    }

    const conversation: Conversation = {
      id: row.id,
      title: row.title,
      userRef: row.userRef,
    };

    return conversation;
  }

  async createConversation(conversation: Conversation) {
    await this.conversationTable().insert({
      id: conversation.id,
      title: conversation.title,
      userRef: conversation.userRef,
    });
  }

  async updateConversation(conversation: Conversation) {
    await this.conversationTable().where({ id: conversation.id }).update({
      title: conversation.title,
      userRef: conversation.userRef,
    });
  }

  async getConversations(userRef: string): Promise<Conversation[]> {
    const rows = await this.conversationTable()
      .where({ userRef })
      .select('*')
      .orderBy('created_at', 'desc');

    const conversations: Conversation[] = rows.map(row => ({
      id: row.id,
      title: row.title,
      userRef: row.userRef,
    }));

    return conversations;
  }

  async getMessageById(messageId: string): Promise<Required<Message> | null> {
    const row = await this.messageTable().where({ id: messageId }).first();

    if (!row) {
      return null;
    }

    const message: Required<Message> = {
      id: row.id,
      role: row.role,
      content: row.content,
      metadata: row.metadata,
      score: row.score,
      traceId: row.trace_id,
    };

    return message;
  }
}
