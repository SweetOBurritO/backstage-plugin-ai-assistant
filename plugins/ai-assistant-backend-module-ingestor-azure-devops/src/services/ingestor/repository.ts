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
import {
  getProgressStats,
  createPathFilter,
  validateExclusionPatterns,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { DEFAULT_REPO_FILE_BATCH_SIZE } from '../../constants/default-repo-file-batch-size';
import { DEFAULT_PATH_EXCLUSIONS } from '../../constants/default-path-exclusions';
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

  // Process and validate repository filters
  type RepositoryMatcher = {
    value: string;
    regex: RegExp;
    fileTypes?: string[];
    pathExclusions?: string[];
  };

  const includeMatchers: RepositoryMatcher[] = [];
  const excludeMatchers: RepositoryMatcher[] = [];

  if (repositoriesFilter?.include) {
    for (const filter of repositoriesFilter.include) {
      try {
        // All strings are treated as regular expression patterns; escape special characters for exact literal matches
        const regex = new RegExp(filter.name);
        includeMatchers.push({
          value: filter.name,
          regex,
          fileTypes: filter.fileTypes,
          pathExclusions: filter.pathExclusions,
        });
      } catch (error) {
        logger.error(
          `Invalid regular expression in repository include '${filter.name}': ${error}`,
        );
        throw new Error(
          `Invalid repository include pattern '${filter.name}': ${error}`,
        );
      }
    }
  }

  if (repositoriesFilter?.exclude) {
    for (const filter of repositoriesFilter.exclude) {
      try {
        // All strings are valid regex - plain strings match exactly, patterns match as regex
        const regex = new RegExp(filter.name);
        excludeMatchers.push({
          value: filter.name,
          regex,
        });
      } catch (error) {
        logger.error(
          `Invalid regular expression in repository exclude '${filter.name}': ${error}`,
        );
        throw new Error(
          `Invalid repository exclude pattern '${filter.name}': ${error}`,
        );
      }
    }
  }

  if (includeMatchers.length > 0) {
    logger.info(
      `Repository include filters: ${includeMatchers
        .map(m => `'${m.value}'`)
        .join(', ')}`,
    );
  }
  if (excludeMatchers.length > 0) {
    logger.info(
      `Repository exclude filters: ${excludeMatchers
        .map(m => `'${m.value}'`)
        .join(', ')}`,
    );
  }

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

  // Get global path exclusion patterns from configuration, defaulting to predefined patterns
  const globalPathExclusions =
    config.getOptionalStringArray(
      'aiAssistant.ingestors.azureDevOps.pathExclusions',
    ) ?? DEFAULT_PATH_EXCLUSIONS;

  // Validate exclusion patterns
  const validation = validateExclusionPatterns(globalPathExclusions);
  if (!validation.isValid) {
    logger.error(
      `Invalid path exclusion patterns in Azure DevOps ingestor configuration: ${validation.errors.join(
        ', ',
      )}`,
    );
    throw new Error(
      `Invalid path exclusion patterns: ${validation.errors.join(', ')}`,
    );
  }
  if (validation.warnings.length > 0) {
    logger.warn(
      `Path exclusion pattern warnings: ${validation.warnings.join(', ')}`,
    );
  }

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

        try {
          const [content, lastUpdated] = await Promise.all([
            azureDevOpsService.getRepoItemContent(repository.id!, item.path!),
            azureDevOpsService.getRepoItemLastUpdated(
              repository.id!,
              item.path!,
            ),
          ]);

          const completionStats = getProgressStats(
            globalIndex + 1,
            items.length,
          );

          logger.info(
            `Retrieved content for Azure DevOps item: ${item.path} in repository: "${repository.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of repository]`,
          );

          const text = await streamToString(content);

          const document: EmbeddingDocument = {
            metadata: {
              source: MODULE_ID,
              id: `${repository.id}:${item.path}`,
              url: item.url!,
              organization: azureDevOpsService.organization,
              project: azureDevOpsService.project,
              repository: repository.name!,
            },
            content: text,
            lastUpdated,
          };

          documents.push(document);
        } catch (error) {
          logger.warn(
            `Failed to retrieve content for Azure DevOps item: ${item.path} in repository: "${repository.name}". Error: ${error}. Skipping item and continuing.`,
          );
          // Continue to next item instead of crashing entire ingestion
        }
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

    // Filter repositories using matchers
    let repositoriesToIngest = repositoriesList;

    // If include matchers exist, only include repos that match at least one
    if (includeMatchers.length > 0) {
      logger.info(
        `Include filter found. Only including repositories matching the following patterns for ingestion: ${includeMatchers
          .map(m => `'${m.value}'`)
          .join(', ')}`,
      );

      repositoriesToIngest = repositoriesToIngest.filter(repo => {
        return includeMatchers.some(matcher => matcher.regex!.test(repo.name!));
      });
    }

    // Apply exclusions
    if (excludeMatchers.length > 0) {
      logger.info(
        `Exclude filter found. Excluding repositories matching the following patterns from ingestion: ${excludeMatchers
          .map(m => `'${m.value}'`)
          .join(', ')}`,
      );

      const excludedRepos = repositoriesToIngest.filter(repo => {
        return excludeMatchers.some(matcher => matcher.regex!.test(repo.name!));
      });

      if (excludedRepos.length > 0) {
        logger.info(
          `Excluding repositories: ${excludedRepos
            .map(r => r.name)
            .join(', ')}`,
        );
      }
      repositoriesToIngest = repositoriesToIngest.filter(repo => {
        return !excludeMatchers.some(matcher =>
          matcher.regex!.test(repo.name!),
        );
      });
    }

    if (repositoriesToIngest.length === 0) {
      logger.warn(
        'No repositories found for ingestion after applying the filter',
      );
      return;
    }

    logger.debug(
      `Repositories to ingest: ${repositoriesToIngest
        .map(r => r.name)
        .join(', ')}`,
    );

    logger.info(
      `Ingesting ${repositoriesToIngest.length} repositories from Azure DevOps`,
    );

    // Get items from each repository and create documents to be embedded
    for (const repo of repositoriesToIngest) {
      logger.info(
        `Beginning ingestion for repository: ${repo.name} (${repo.id})`,
      );

      // Find the matching include matcher for this repository
      const matchingMatcher = includeMatchers.find(matcher =>
        matcher.regex!.test(repo.name!),
      );

      // Determine the file types to use for this repository or use default
      const repositoryFileTypesFilter = matchingMatcher?.fileTypes ?? fileTypes;

      // Determine the path exclusions to use for this repository or use global default
      const repositoryPathExclusions =
        matchingMatcher?.pathExclusions ?? globalPathExclusions;

      logger.info(
        `Processing file types for repository ${
          repo.name
        }: [${repositoryFileTypesFilter.join(', ')}]`,
      );

      logger.info(
        `Using path exclusions for repository ${
          repo.name
        }: [${repositoryPathExclusions.join(', ')}]`,
      );

      // Get the items to be ingested from the repository based on the file types filter
      let items = await azureDevOpsService.getRepoItems(
        repo.id!,
        repositoryFileTypesFilter,
      );

      // Apply path exclusion filtering
      const pathFilter = createPathFilter({
        exclusionPatterns: repositoryPathExclusions,
      });

      const originalItemCount = items.length;

      // Log excluded items for debugging
      const excludedItems = items.filter(
        item => item.path && pathFilter.shouldExcludePath(item.path),
      );

      if (excludedItems.length > 0) {
        logger.debug(
          `Items excluded from repository ${repo.name}: ${excludedItems
            .map(i => i.path)
            .join(', ')}`,
        );
      }

      items = pathFilter.filterFiles(items);
      const filteredItemCount = originalItemCount - items.length;

      if (filteredItemCount > 0) {
        logger.info(
          `Filtered out ${filteredItemCount} items from repository ${repo.name} based on path exclusion patterns`,
        );
      }

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
