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

  /** Ingest Azure DevOps repositories in batches */
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

      logger.debug(`Items: ${JSON.stringify(items, null, 2)}`);

      // Generate embedding documents for each item
      const documents: EmbeddingDocument[] = [];

      for (let index = 0; index < items.length; index++) {
        const item = items[index];

        const content = await azureDevOpsService.getRepoItemContent(
          repo.id!,
          item.path!,
        );

        const completionStats = getProgressStats(index + 1, items.length);

        logger.info(
          `Retrieved content for Azure DevOps item: ${item.path} in repository: "${repo.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of repository]`,
        );

        const text = await streamToString(content);

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${repo.id}:${item.path}`,
            url: item.url,
            organization: azureDevOpsService.organization,
            project: azureDevOpsService.project,
            repository: repo.name!,
          },
          content: text,
        };

        documents.push(document);
      }

      // Save the documents in batches
      await saveDocumentsBatch(documents);

      logger.info(
        `${documents.length} documents ingested for Azure DevOps repository: ${repo.name}`,
      );
    }
  };

  return { ingestRepositoriesBatch };
};
