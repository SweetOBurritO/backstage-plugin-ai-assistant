import { VectorStore } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { applyDatabaseMigrations } from './migrations';
import { PgVectorStore, PgVectorStoreOptions } from './pg-vector-store';

export const createPgVectorStore = async ({
  database,
  logger,
  config,
}: PgVectorStoreOptions): Promise<VectorStore> => {
  const client = await database.getClient();

  await applyDatabaseMigrations(client);

  return PgVectorStore.fromConfig({
    database,
    logger,
    config,
  });
};
