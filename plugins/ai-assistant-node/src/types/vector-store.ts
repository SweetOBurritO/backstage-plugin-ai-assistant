import { Embeddings } from '@langchain/core/embeddings';

export type EmbeddingsSource = string;

/**
 * Metadata that is required for each document to be embedded.
 * - `source`: The source of the document, e.g. 'github', 'azure-devops', etc.
 * - `id`: A unique identifier for the document within the source. Does not necessarily need to be globally unique or a UUID.
 * Additional metadata can be added as needed.
 */
export type EmbeddingDocumentMetadata = {
  source: EmbeddingsSource;
  id: string;
  url: string;
  [key: string]: string;
};

export type EmbeddingDocument = {
  metadata: EmbeddingDocumentMetadata;
  content: string;
  vector?: string;
  hash?: string;
  lastUpdated?: Date;
  id?: string;
};

type DeletionParams = {
  ids?: string[];
  filter?: Partial<EmbeddingDocumentMetadata>;
};

export interface VectorStore {
  connectEmbeddings(embeddings: Embeddings): void;
  addDocuments(docs: EmbeddingDocument[]): Promise<void>;
  deleteDocuments(deletionParams: DeletionParams): Promise<void>;
  similaritySearch(
    query: string,
    filter?: Partial<EmbeddingDocumentMetadata>,
    amount?: number,
  ): Promise<EmbeddingDocument[]>;
}

export type EntityFilterShape =
  | Record<string, string | symbol | (string | symbol)[]>[]
  | Record<string, string | symbol | (string | symbol)[]>
  | undefined;

export interface AugmentationIndexer {
  vectorStore: VectorStore;
  createEmbeddings(
    source: EmbeddingsSource,
    filter?: EntityFilterShape,
  ): Promise<number>;
  deleteEmbeddings(
    source: EmbeddingsSource,
    filter: EntityFilterShape,
  ): Promise<void>;
}
