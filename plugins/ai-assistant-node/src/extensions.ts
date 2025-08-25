import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { Ingestor } from './types/ingestor';
import { Embeddings } from '@langchain/core/embeddings';

export type DataIngestorExtensionPoint = {
  registerIngestor: (ingestor: Ingestor) => void;
};

export const dataIngestorExtensionPoint =
  createExtensionPoint<DataIngestorExtensionPoint>({
    id: 'ai-assistant.data-ingestor',
  });

export type EmbeddingsProvider = {
  getEmbeddings: () => Promise<Embeddings>;
};

export type EmbeddingsProviderExtensionPoint = {
  register: (provider: EmbeddingsProvider) => void;
};

export const embeddingsProviderExtensionPoint =
  createExtensionPoint<EmbeddingsProviderExtensionPoint>({
    id: 'ai-assistant.embeddings-provider',
  });
