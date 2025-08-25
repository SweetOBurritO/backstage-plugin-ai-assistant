import {
  DataIngestionPipeline,
  DataIngestionPipelineOptions,
  EmbeddingDocument,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

import {
  SchedulerServiceTaskScheduleDefinition,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';

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

      // TODO: This will cause these vectors to not be available while processing new documents
      // We should rather look at deleting a specific document from the store as it is added if the ids match
      await vectorStore.deleteDocuments({ filter: { source: ingestor.id } });

      const saveDocumentsBatch = async (documents: EmbeddingDocument[]) => {
        logger.info(
          `Ingested documents for ${ingestor.id}: ${documents.length}`,
        );

        logger.info(`Adding documents to vector store...`);
        await vectorStore.addDocuments(documents);
        logger.info(`Added documents to vector store for ${ingestor.id}`);
      };

      const documents = await ingestor.ingest({
        saveDocumentsBatch,
      });

      console.log('documents:', documents);

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
