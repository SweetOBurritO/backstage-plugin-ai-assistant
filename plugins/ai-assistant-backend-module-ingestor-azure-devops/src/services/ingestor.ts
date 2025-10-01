import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { streamToString } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { createAzureDevOpsService } from './azure-devops';
import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../constants/module';
import { Config } from '../../config';

export const createAzureDevOpsIngestor = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}): Promise<Ingestor> => {
  // Default to common file types if none are specified
  const defaultFileTypes = ['.md', '.json'];

  // Get configuration values
  const repositoriesFilter = config.getOptional<
    Config['aiAssistant']['ingestors']['azureDevOps']['repositories']
  >('aiAssistant.ingestors.azureDevOps.repositories');

  const fileTypes =
    config.getOptionalStringArray(
      'aiAssistant.ingestors.azureDevOps.fileTypes',
    ) ?? defaultFileTypes;

  // Create Azure DevOps service
  const adoService = await createAzureDevOpsService({ config, logger });

  /** Ingest Azure DevOps repositories in batches */
  const ingestAzureDevOpsBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
  ) => {
    const repositoriesList = await adoService.getRepos();

    if (repositoriesList.length === 0) {
      logger.warn('No repositories found in the Azure DevOps project');
      return;
    }

    // Filter repositories if a filter is provided in the config
    const repositoriesToIngest = repositoriesFilter
      ? repositoriesList.filter(repo =>
          repositoriesFilter?.some(
            filteredRepo =>
              filteredRepo.name.toLowerCase() === repo.name!.toLowerCase(),
          ),
        )
      : repositoriesList;

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
      const items = await adoService.getRepoItems(
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

      for (const item of items) {
        const content = await adoService.getRepoItemContent(
          repo.id!,
          item.path!,
        );
        logger.info(`Retrieved content for Azure DevOps item: ${item.path}`);

        const text = await streamToString(content);

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${repo.id}:${item.path}`,
            url: item.url,
            organization: adoService.organization,
            project: adoService.project,
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

  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    await ingestAzureDevOpsBatch(saveDocumentsBatch);
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
