import { DatabaseService } from '@backstage/backend-plugin-api';

import { Knex } from 'knex';

const MCP_TABLE_NAME = 'user_mcp_config';

export type McpStoreOptions = {
  database: DatabaseService;
};

export class McpStore {
  /**
   * Creates an instance of ChatStore.
   * @param client - The Knex client to interact with the PostgreSQL database.
   */
  constructor(private readonly client: Knex) {}

  static async fromConfig({ database }: McpStoreOptions) {
    const client = await database.getClient();
    return new McpStore(client);
  }

  mcpTable() {
    return this.client(MCP_TABLE_NAME);
  }

  async getUserUserMcpConfigNames(userRef: string): Promise<string[]> {
    const rows = await this.mcpTable().where({ userRef }).select('name');
    return rows.map(row => row.name);
  }

  async getUserMcpConfigs(
    userRef: string,
  ): Promise<Array<{ name: string; encryptedOptions: string }>> {
    const rows = await this.mcpTable().where({ userRef }).select();
    return rows.map(row => ({
      name: row.name,
      encryptedOptions: row.encryptedOptions,
    }));
  }

  async createUserMcpConfig(
    userRef: string,
    name: string,
    encryptedOptions: string,
  ): Promise<void> {
    await this.mcpTable().insert({
      userRef,
      name,
      encryptedOptions,
    });
  }

  async updateUserMcpConfig(
    userRef: string,
    name: string,
    encryptedOptions: string,
  ): Promise<void> {
    await this.mcpTable().where({ userRef, name }).update({ encryptedOptions });
  }

  async deleteUserMcpConfig(userRef: string, name: string): Promise<void> {
    await this.mcpTable().where({ userRef, name }).delete();
  }
}
