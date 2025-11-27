import {
  DataIngestionPipeline,
  DataIngestionPipelineOptions,
  EmbeddingDocument,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

import {
  SchedulerServiceTaskScheduleDefinition,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const DEFAULT_DATA_INGESTION_SCHEDULE: SchedulerServiceTaskScheduleDefinition =
  {
    frequency: {
      hours: 24,
    },
    timeout: {
      hours: 3,
    },
  };

const DEFAULT_MAX_CHUNK_PROCESSING_SIZE = 100;
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 100;

export const createDataIngestionPipeline = ({
  config,
  logger,
  scheduler,
  ingestors,
  vectorStore,
}: DataIngestionPipelineOptions): DataIngestionPipeline => {
  const schedule = config.has('aiAssistant.ingestion.schedule')
    ? readSchedulerServiceTaskScheduleDefinitionFromConfig(
        config.getConfig('aiAssistant.ingestion.schedule'),
      )
    : DEFAULT_DATA_INGESTION_SCHEDULE;

  const chunkSize =
    config.getOptionalNumber('aiAssistant.ingestion.chunking.chunkSize') ??
    DEFAULT_CHUNK_SIZE;

  const chunkOverlap =
    config.getOptionalNumber('aiAssistant.ingestion.chunking.chunkOverlap') ??
    DEFAULT_CHUNK_OVERLAP;

  const maxChunkProcessingSize =
    config.getOptionalNumber(
      'aiAssistant.ingestion.chunking.maxChunkProcessingSize',
    ) ?? DEFAULT_MAX_CHUNK_PROCESSING_SIZE;

  const taskRunner = scheduler.createScheduledTaskRunner(schedule);

  const taskId = `ai-assistant.data-ingestion:start`;

  const dataIngestion = async () => {
    logger.info('Starting data ingestion...');

    if (ingestors.length === 0) {
      logger.warn('No ingestors available for data ingestion.');
      return;
    }

    logger.info(`Ingestors available: ${ingestors.map(i => i.id).join(', ')}`);

    for await (const ingestor of ingestors) {
      logger.info(`Running ingestor: ${ingestor.id}`);

      const saveDocumentsBatch = async (documents: EmbeddingDocument[]) => {
        logger.info(
          `Ingested documents for ${ingestor.id}: ${documents.length}`,
        );

        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
        });

        const documentChunks = await Promise.all(
          documents.map(async document => {
            // Delete existing documents with this document id and ingestor source
            logger.debug(
              `Deleting existing documents with id: [${document.metadata.id}] and source: [${ingestor.id}]`,
            );
            await vectorStore.deleteDocuments({
              filter: { source: ingestor.id, id: document.metadata.id },
            });

            const chunks = await splitter.splitText(document.content);

            const docChunks: EmbeddingDocument[] = chunks.flatMap(
              (chunk, i) => ({
                metadata: { ...document.metadata, chunk: String(i) },
                content: chunk,
              }),
            );

            return docChunks;
          }),
        );

        logger.info(`Adding documents to vector store...`);
        const allChunks = documentChunks.flat();

        logger.info(
          `Total document chunks for batch to add for ${ingestor.id}: ${allChunks.length}`,
        );

        for (let i = 0; i < allChunks.length; i += maxChunkProcessingSize) {
          const chunkBatch = allChunks.slice(i, i + maxChunkProcessingSize);
          logger.info(
            `Adding batch of ${chunkBatch.length} document chunks to vector store for ${ingestor.id}`,
          );

          await vectorStore.addDocuments(chunkBatch);
        }

        logger.info(`Added documents to vector store for ${ingestor.id}`);
      };

      const documents = await ingestor.ingest({
        saveDocumentsBatch,
      });

      if (documents) {
        saveDocumentsBatch(documents);
      }

      logger.info(`Finished processing ingestor: ${ingestor.id}`);
    }

    logger.info('Data ingestion completed.');
  };

  const start = async () => {
    taskRunner.run({
      id: taskId,
      fn: dataIngestion,
    });
  };

  return {
    start,
  };
};
