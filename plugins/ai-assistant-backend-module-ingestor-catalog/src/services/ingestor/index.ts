import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AuthService, DiscoveryService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { mapEntityToEmbeddingDoc } from './helpers/entity-to-embedding-doc';
import { MODULE_ID } from '../../constants/module';

type CatalogIngestorOptions = {
  auth: AuthService;
  discovery: DiscoveryService;
};

const MAX_RESULTS = 50;

export const createCatalogIngestor = async ({
  auth,
  discovery,
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

    const response = await fetch(
      `${baseUrl}/entities/by-query?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
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
