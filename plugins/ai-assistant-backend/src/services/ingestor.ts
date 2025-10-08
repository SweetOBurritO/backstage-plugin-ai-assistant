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
          chunkSize: 500, // TODO: Make chunk size configurable
          chunkOverlap: 50, // TODO: Make chunk overlap configurable
        });

        const docs = await Promise.all(
          documents.map(async document => {
            // Delete existing documents with this document id and ingestor source
            logger.info(
              `Deleting existing documents with id: [${document.metadata.id}] and source: [${ingestor.id}]`,
            );
            await vectorStore.deleteDocuments({
              filter: { source: ingestor.id, id: document.metadata.id },
            });

            const chunks = await splitter.splitText(document.content);

            const chunkDocs: EmbeddingDocument[] = chunks.flatMap(
              (chunk, i) => ({
                metadata: { ...document.metadata, chunk: String(i) },
                content: chunk,
              }),
            );

            return chunkDocs;
          }),
        );

        logger.info(`Adding documents to vector store...`);
        await vectorStore.addDocuments(docs.flat());
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
