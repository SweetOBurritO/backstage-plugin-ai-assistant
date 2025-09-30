import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { streamToString } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { createAzureDevOpsService } from './azure-devops';
import { Config } from '@sweetoburrito/backstage-plugin-ai-assistant-backend/config';
import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../constants/module';

export const createAzureDevOpsIngestor = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}): Promise<Ingestor> => {
  const defaultFileTypes = ['.md', '.json'];

  const repositoriesFilter: Config['aiAssistant']['ingestors']['azureDevOps']['repositories'] =
    config.get('aiAssistant.ingestors.azureDevOps.repositories');

  const fileTypes =
    config.getOptionalStringArray(
      'aiAssistant.ingestors.azureDevOps.fileTypes',
    ) ?? defaultFileTypes;

  const adoService = await createAzureDevOpsService({ config, logger });

  const ingestAzureDevOpsBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
  ) => {
    const repositoriesList = await adoService.getRepos();

    if (repositoriesList.length === 0) {
      logger.warn('No repositories found in the Azure DevOps project');
      return;
    }

    const repositoriesToIngest = repositoriesFilter
      ? repositoriesList.filter(repo =>
          repositoriesFilter.some(
            filteredRepo =>
              filteredRepo.name.toLowerCase() === repo.name!.toLowerCase(),
          ),
        )
      : repositoriesList;

    for (const repo of repositoriesToIngest) {
      logger.info(
        `Beginning ingestion for repository: ${repo.name} (${repo.id})`,
      );

      // Determine the file types to use for this repository or use default
      const repositoryFileTypesFilter =
        repositoriesFilter.find(
          r => r.name.toLowerCase() === repo.name.toLowerCase(),
        )?.fileTypes ?? fileTypes;

      logger.info(
        `Processing file types for repository ${
          repo.name
        }: [${repositoryFileTypesFilter.join(', ')}]`,
      );

      // Get the items in the repository
      const items = await adoService.getRepoItems(
        repo.id!,
        repositoryFileTypesFilter,
      );

      logger.debug(`Items: ${JSON.stringify(items, null, 2)}`);

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
