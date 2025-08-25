import { Embeddings } from '@langchain/core/embeddings';

export type EmbeddingsSource = string;

export type EmbeddingDocumentMetadata = Partial<{
  source: EmbeddingsSource;
  id: string;
  [key: string]: string;
}>;

export type Embedding = {
  metadata: EmbeddingDocumentMetadata;
  content: string;
  vector: number[];
  id: string;
};

export type EmbeddingDocument = {
  metadata: EmbeddingDocumentMetadata;
  content: string;
};

type DeletionParams = {
  ids?: string[];
  filter?: EmbeddingDocumentMetadata;
};

export interface VectorStore {
  connectEmbeddings(embeddings: Embeddings): void;
  addDocuments(docs: EmbeddingDocument[]): Promise<void>;
  deleteDocuments(deletionParams: DeletionParams): Promise<void>;
  similaritySearch(
    query: string,
    filter?: EmbeddingDocumentMetadata,
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
