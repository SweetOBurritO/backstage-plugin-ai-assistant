import {
  LoggerService,
  RootConfigService,
  SchedulerService,
} from '@backstage/backend-plugin-api';
import { EmbeddingDocument, VectorStore } from './vector-store';

export type IngestorOptions = {
  saveDocumentsBatch: (documents: EmbeddingDocument[]) => Promise<void>;
};

export type Ingestor = {
  id: string;
  ingest: (options: IngestorOptions) => Promise<EmbeddingDocument[] | void>;
};

export type DataIngestionPipelineOptions = {
  logger: LoggerService;
  config: RootConfigService;
  scheduler: SchedulerService;
  vectorStore: VectorStore;
  ingestors: Ingestor[];
};

export type DataIngestionPipeline = {
  start: () => Promise<void>;
};
