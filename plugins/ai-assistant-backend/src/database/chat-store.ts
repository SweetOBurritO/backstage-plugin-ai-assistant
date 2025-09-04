import { DatabaseService } from '@backstage/backend-plugin-api';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

import { Knex } from 'knex';

const TABLE_NAME = 'conversation';

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

  table() {
    return this.client(TABLE_NAME);
  }

  async getChatMessages(
    conversationId: string,
    userRef: string,
    limit?: number,
  ): Promise<Required<Message>[]> {
    let query = this.table()
      .where({ conversation_id: conversationId, userRef })
      .select('*');

    if (typeof limit === 'number') {
      query = query.limit(limit).orderBy('created_at', 'desc');
    }

    const rows = await query;

    const chatMessages: Required<Message>[] = rows.map(row => ({
      role: row.role,
      content: row.content,
      id: row.id,
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
      userRef,
      created_at: this.client.fn.now(),
    }));

    await this.table().insert(rows);
  }
}
