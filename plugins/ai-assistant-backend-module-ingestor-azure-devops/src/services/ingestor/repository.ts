import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { DEFAULT_FILE_TYPES } from '../../constants/default-file-types';
import {
  EmbeddingDocument,
  IngestorOptions,
  streamToString,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AzureDevOpsService } from '../azure-devops';
import { Config } from '../../../config';
import { MODULE_ID } from '../../constants/module';
import { getProgressStats } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { DEFAULT_REPO_FILE_BATCH_SIZE } from '../../constants/default-repo-file-batch-size';
import {
  GitItem,
  GitRepository,
} from 'azure-devops-node-api/interfaces/GitInterfaces';

type RepositoryIngestorOptions = {
  config: RootConfigService;
  logger: LoggerService;
  azureDevOpsService: AzureDevOpsService;
};

export const createRepositoryIngestor = async ({
  config,
  logger,
  azureDevOpsService,
}: RepositoryIngestorOptions) => {
  // Get configuration values
  const repositoriesFilter = config.getOptional<
    Config['aiAssistant']['ingestors']['azureDevOps']['repositories']
  >('aiAssistant.ingestors.azureDevOps.repositories');

  // Default to common file types if none are specified
  const fileTypes =
    config.getOptionalStringArray(
      'aiAssistant.ingestors.azureDevOps.fileTypes',
    ) ?? DEFAULT_FILE_TYPES;

  // Get batch size for processing repository items (default to 50 items per batch)
  const itemsBatchSize =
    config.getOptionalNumber(
      'aiAssistant.ingestors.azureDevOps.filesBatchSize', // Reuse the same config for consistency
    ) ?? DEFAULT_REPO_FILE_BATCH_SIZE;

  /**
   * Ingest Azure DevOps repository items in batches
   * @param repository - The repository to ingest items from
   * @param items - The list of items to ingest from the repository
   * @param saveDocumentsBatch - Function to save a batch of embedding documents
   * @returns Total number of documents ingested and sent for embedding from the repository
   */
  const ingestRepoByFileBatch = async ({
    repository,
    items,
    saveDocumentsBatch,
  }: {
    repository: GitRepository;
    items: GitItem[];
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'];
  }) => {
    logger.info(
      `Processing ${items.length} items from repository "${repository.name}" in batches of ${itemsBatchSize}`,
    );

    logger.debug(`Items: ${JSON.stringify(items, null, 2)}`);

    let totalDocumentsIngested = 0;

    // Process items in batches to manage memory and performance
    const totalBatches = Math.ceil(items.length / itemsBatchSize);

    for (
      let batchStart = 0;
      batchStart < items.length;
      batchStart += itemsBatchSize
    ) {
      const batchEnd = Math.min(batchStart + itemsBatchSize, items.length);
      const itemsBatch = items.slice(batchStart, batchEnd);
      const batchNumber = Math.floor(batchStart / itemsBatchSize) + 1;

      logger.info(
        `Processing batch ${batchNumber}/${totalBatches} (${itemsBatch.length} items) for repository "${repository.name}"`,
      );

      // Generate embedding documents for each item in the current batch
      const documents: EmbeddingDocument[] = [];

      for (let index = 0; index < itemsBatch.length; index++) {
        const item = itemsBatch[index];
        const globalIndex = batchStart + index;

        const content = await azureDevOpsService.getRepoItemContent(
          repository.id!,
          item.path!,
        );

        const completionStats = getProgressStats(globalIndex + 1, items.length);

        logger.info(
          `Retrieved content for Azure DevOps item: ${item.path} in repository: "${repository.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of repository]`,
        );

        const text = await streamToString(content);

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${repository.id}:${item.path}`,
            url: item.url,
            organization: azureDevOpsService.organization,
            project: azureDevOpsService.project,
            repository: repository.name!,
          },
          content: text,
        };

        documents.push(document);
      }

      // Save the current batch of documents
      await saveDocumentsBatch(documents);

      totalDocumentsIngested += documents.length;

      logger.info(
        `Batch ${batchNumber}/${totalBatches} completed: ${documents.length} documents ingested for Azure DevOps repository: ${repository.name}`,
      );
    }

    return { totalDocumentsIngested };
  };

  /** Ingest Azure DevOps repositories in batches
   * @param saveDocumentsBatch - Function to save a batch of embedding documents
   * @returns void
   */
  const ingestRepositoriesBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
  ) => {
    const repositoriesList = await azureDevOpsService.getRepos();

    if (repositoriesList.length === 0) {
      logger.warn('No repositories found in the Azure DevOps project');
      return;
    }

    logger.info(
      `Filtering for repositories: ${repositoriesFilter
        ?.map(repo => repo.name)
        .join(', ')}`,
    );

    // Filter repositories if a filter is provided in the config
    const repositoriesToIngest = repositoriesFilter
      ? repositoriesList.filter(repo =>
          repositoriesFilter?.some(
            filteredRepo =>
              filteredRepo.name.toLowerCase() === repo.name!.toLowerCase(),
          ),
        )
      : repositoriesList;

    if (repositoriesToIngest.length === 0) {
      logger.warn(
        'No repositories found for ingestion after applying the filter',
      );
      return;
    }

    logger.info(
      `Ingesting ${repositoriesToIngest.length} repositories from Azure DevOps`,
    );

    // Get items from each repository and create documents to be embedded
    for (const repo of repositoriesToIngest) {
      logger.info(
        `Beginning ingestion for repository: ${repo.name} (${repo.id})`,
      );

      // Determine the file types to use for this repository or use default
      const repositoryFileTypesFilter =
        repositoriesFilter?.find(
          r => r.name.toLowerCase() === repo.name!.toLowerCase(),
        )?.fileTypes ?? fileTypes;

      logger.info(
        `Processing file types for repository ${
          repo.name
        }: [${repositoryFileTypesFilter.join(', ')}]`,
      );

      // Get the items to be ingested from the repository based on the file types filter
      const items = await azureDevOpsService.getRepoItems(
        repo.id!,
        repositoryFileTypesFilter,
      );

      if (items.length === 0) {
        logger.warn(
          `No items found for ingestion in the Azure DevOps repository ${
            repo.name
          } (${
            repo.id
          }) with the specified file types filter: [${repositoryFileTypesFilter.join(
            ', ',
          )}]`,
        );
        continue;
      }

      const { totalDocumentsIngested } = await ingestRepoByFileBatch({
        repository: repo,
        items,
        saveDocumentsBatch,
      });

      if (totalDocumentsIngested === 0) {
        logger.warn(
          `No documents were ingested and sent for embedding from the Azure DevOps repository ${repo.name} (${repo.id})`,
        );
        continue;
      }

      logger.info(
        `Repository ingestion completed: ${totalDocumentsIngested} total documents ingested and sent for embedding for Azure DevOps repository: ${repo.name}`,
      );
    }
  };

  return { ingestRepositoriesBatch };
};
