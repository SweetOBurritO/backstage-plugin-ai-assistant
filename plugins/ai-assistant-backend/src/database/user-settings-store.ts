import { DatabaseService } from '@backstage/backend-plugin-api';

import { Knex } from 'knex';

const USER_SETTINGS_TABLE = 'user_ai_assistant_settings';

export type UserSettingsStoreOptions = {
  database: DatabaseService;
};

export class UserSettingsStore {
  /**
   * Creates an instance of UserSettingsStore.
   * @param client - The Knex client to interact with the PostgreSQL database.
   */
  constructor(private readonly client: Knex) {}

  static async fromConfig({ database }: UserSettingsStoreOptions) {
    const client = await database.getClient();
    return new UserSettingsStore(client);
  }

  userSettingsTable() {
    return this.client(USER_SETTINGS_TABLE);
  }

  async getUserSettings<T extends Record<string, unknown>>(
    userRef: string,
  ): Promise<Array<{ type: string; data: Partial<T> }>> {
    const rows = await this.userSettingsTable().where({ userRef }).select();
    return rows.map(row => {
      const data: T = JSON.parse(row.data);

      return { type: row.type, data };
    });
  }

  async getUserSettingsByType<T extends Record<string, unknown>>(
    userRef: string,
    type: string,
  ): Promise<T | null> {
    const row = await this.userSettingsTable().where({ userRef, type }).first();
    if (!row) {
      return null;
    }

    return row.data;
  }

  async setUserSettings<T extends Record<string, unknown>>(
    userRef: string,
    type: string,
    data: Partial<T>,
  ): Promise<void> {
    const jsonData = JSON.stringify(data);
    await this.userSettingsTable()
      .insert({ userRef, type, data: jsonData })
      .onConflict(['userRef', 'type'])
      .merge({ data: jsonData, updated_at: this.client.fn.now() });
  }

  async deleteUserSettings(userRef: string, type: string): Promise<void> {
    await this.userSettingsTable().where({ userRef, type }).delete();
  }
}
