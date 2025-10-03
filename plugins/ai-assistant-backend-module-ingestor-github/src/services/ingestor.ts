import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { createGitHubService } from './github';
import {
  EmbeddingDocument,
  Ingestor,
  IngestorOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../constants/module';
import { Config } from '../../config';

export const createGitHubIngestor = async ({
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
    Config['aiAssistant']['ingestors']['github']['repositories']
  >('aiAssistant.ingestors.github.repositories');

  const fileTypes =
    config.getOptionalStringArray(
      'aiAssistant.ingestors.github.fileTypes',
    ) ?? defaultFileTypes;

  // Create GitHub service
  const githubService = await createGitHubService({ config, logger });

  /** Ingest GitHub repositories in batches */
  const ingestGitHubBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
  ) => {
    const repositoriesList = await githubService.getRepos();

    if (repositoriesList.length === 0) {
      logger.warn('No repositories found for the GitHub owner');
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
              filteredRepo.name.toLowerCase() === repo.name.toLowerCase(),
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
      `Ingesting ${repositoriesToIngest.length} repositories from GitHub`,
    );

    // Get files from each repository and create documents to be embedded
    for (const repo of repositoriesToIngest) {
      logger.info(
        `Beginning ingestion for repository: ${repo.name} (${repo.id})`,
      );

      // Determine the file types to use for this repository or use default
      const repositoryFileTypesFilter =
        repositoriesFilter?.find(
          r => r.name.toLowerCase() === repo.name.toLowerCase(),
        )?.fileTypes ?? fileTypes;

      logger.info(
        `Processing file types for repository ${
          repo.name
        }: [${repositoryFileTypesFilter.join(', ')}]`,
      );

      // Get the files to be ingested from the repository based on the file types filter
      const files = await githubService.getRepoFiles(
        repo.name,
        repositoryFileTypesFilter,
      );

      if (files.length === 0) {
        logger.warn(
          `No files found for ingestion in the GitHub repository ${
            repo.name
          } (${
            repo.id
          }) with the specified file types filter: [${repositoryFileTypesFilter.join(
            ', ',
          )}]`,
        );
        continue;
      }

      logger.debug(`Files: ${JSON.stringify(files, null, 2)}`);

      // Generate embedding documents for each file
      const documents: EmbeddingDocument[] = [];

      for (const file of files) {
        try {
          const content = await githubService.getRepoFileContent(
            repo.name,
            file.path!,
          );
          logger.info(`Retrieved content for GitHub file: ${file.path}`);

          const document: EmbeddingDocument = {
            metadata: {
              source: MODULE_ID,
              id: `${repo.id}:${file.path}`,
              url: file.url || `https://github.com/${githubService.owner}/${repo.name}/blob/main/${file.path}`,
              owner: githubService.owner,
              repository: repo.name,
            },
            content,
          };

          documents.push(document);
        } catch (error) {
          logger.warn(
            `Failed to retrieve content for GitHub file: ${file.path}. Error: ${error}`,
          );
          // Continue with other files even if one fails
          continue;
        }
      }

      // Save the documents in batches
      await saveDocumentsBatch(documents);

      logger.info(
        `${documents.length} documents ingested for GitHub repository: ${repo.name}`,
      );
    }
  };

  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    await ingestGitHubBatch(saveDocumentsBatch);
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
