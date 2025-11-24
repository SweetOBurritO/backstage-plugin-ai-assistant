import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  AuthService,
  DiscoveryService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { mapEntityToEmbeddingDoc } from './helpers/entity-to-embedding-doc';
import { MODULE_ID } from '../../constants/module';
import fetchRetry from 'fetch-retry';

const fetch = fetchRetry(global.fetch);

type CatalogIngestorOptions = {
  auth: AuthService;
  discovery: DiscoveryService;
  logger: LoggerService;
};

const MAX_RESULTS = 25;

export const createCatalogIngestor = async ({
  auth,
  discovery,
  logger,
}: CatalogIngestorOptions): Promise<Ingestor> => {
  const ingestCatalogBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
    cursor?: string,
  ) => {
    const baseUrl = await discovery.getBaseUrl('catalog');

    const credentials = await auth.getOwnServiceCredentials();
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'catalog',
    });

    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }

    params.set('limit', MAX_RESULTS.toString());

    logger.debug(
      `Fetching catalog entities batch, cursor: ${cursor || 'initial'}`,
    );

    const response = await fetch(
      `${baseUrl}/entities/by-query?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        retries: 3,
        retryDelay: attempt => {
          // Adds exponential backoff with jitter for retries

          logger.debug(`Retrying catalog fetch, attempt: ${attempt}`);

          const exponentialDelay = Math.pow(2, attempt) * 500;
          const jitter = Math.random() * 500;
          return exponentialDelay + jitter;
        },
      },
    );

    if (!response.ok) {
      logger.error(
        `Failed to fetch catalog entities: ${response.status} ${response.statusText}`,
      );
      return;
    }

    const data = await response.json();

    const entities = data.items as Entity[];
    const nextCursor = data.pageInfo?.nextCursor;

    const documents: EmbeddingDocument[] = entities.map(
      mapEntityToEmbeddingDoc,
    );

    await saveDocumentsBatch(documents);

    if (!nextCursor) {
      logger.info('Catalog ingestion completed - no more pages');
      return;
    }

    await ingestCatalogBatch(saveDocumentsBatch, nextCursor);
  };

  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    await ingestCatalogBatch(saveDocumentsBatch);
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
