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
import {
  getProgressStats,
  createPathFilter,
  validateExclusionPatterns,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { DEFAULT_FILE_BATCH_SIZE } from '../constants/default-file-batch-size';

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
    config.getOptionalStringArray('aiAssistant.ingestors.github.fileTypes') ??
    defaultFileTypes;

  // Get batch size for processing files (default to 50 files per batch)
  const filesBatchSize =
    config.getOptionalNumber('aiAssistant.ingestors.github.filesBatchSize') ??
    DEFAULT_FILE_BATCH_SIZE;

  // Get global path exclusion patterns from configuration
  const globalPathExclusions = config.getOptionalStringArray(
    'aiAssistant.ingestors.github.pathExclusions',
  );

  // Validate exclusion patterns if provided
  if (globalPathExclusions) {
    const validation = validateExclusionPatterns(globalPathExclusions);
    if (!validation.isValid) {
      logger.error(
        `Invalid path exclusion patterns in GitHub ingestor configuration: ${validation.errors.join(
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
  }

  // Create GitHub service
  const githubService = await createGitHubService({ config, logger });

  /** Ingest GitHub repository files in batches
   * @param repo - The repository to ingest files from
   * @param files - The list of files to ingest from the repository
   * @param saveDocumentsBatch - Function to save a batch of embedding documents
   * @returns Total number of documents ingested and sent for embedding from the repository
   */
  const ingestRepositoryByFileBatch = async ({
    repo,
    files,
    saveDocumentsBatch,
  }: {
    repo: any;
    files: any[];
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'];
  }) => {
    logger.info(
      `Processing ${files.length} files from repository "${repo.name}" in batches of ${filesBatchSize}`,
    );

    let totalDocumentsIngested = 0;

    // Process files in batches to manage memory and performance

    // Calculate total number of batches
    const totalBatches = Math.ceil(files.length / filesBatchSize);

    // Process each batch
    for (
      let batchStart = 0;
      batchStart < files.length;
      batchStart += filesBatchSize
    ) {
      const batchEnd = Math.min(batchStart + filesBatchSize, files.length);
      const filesBatch = files.slice(batchStart, batchEnd);
      const batchNumber = Math.floor(batchStart / filesBatchSize) + 1;

      logger.info(
        `Processing batch ${batchNumber}/${totalBatches} (${filesBatch.length} files) for repository "${repo.name}"`,
      );

      // Generate embedding documents for each file in the current batch
      const documents: EmbeddingDocument[] = [];

      for (let index = 0; index < filesBatch.length; index++) {
        const file = filesBatch[index];
        const globalIndex = batchStart + index;

        try {
          const content = await githubService.getRepoFileContent(
            repo.name,
            file.path!,
          );

          const completionStats = getProgressStats(
            globalIndex + 1,
            files.length,
          );

          logger.info(
            `Retrieved content for GitHub file: "${file.path}" in repository: "${repo.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of repository]`,
          );

          // Generate proper GitHub URL for the file
          const githubUrl = `https://github.com/${githubService.owner}/${
            repo.name
          }/blob/${repo.default_branch || 'main'}/${file.path}`;

          // Create enhanced content with URL reference and metadata
          const enhancedContent = `Repository: ${repo.name}
          File Path: ${file.path}
          GitHub URL: ${githubUrl}
          ${
            repo.description
              ? `Repository Description: ${repo.description}`
              : ''
          }
          
          Content:
          ${content}`;

          const document: EmbeddingDocument = {
            metadata: {
              source: MODULE_ID,
              id: `${repo.id}:${file.path}`,
              url: githubUrl,
              owner: githubService.owner,
              repository: repo.name,
              filePath: file.path,
              fileName: file.path?.split('/').pop() || '',
              branch: repo.default_branch || 'main',
              repositoryDescription: repo.description || '',
            },
            content: enhancedContent,
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

      // Save the current batch of documents
      await saveDocumentsBatch(documents);

      totalDocumentsIngested += documents.length;

      logger.info(
        `Batch ${batchNumber}/${totalBatches} completed: ${documents.length} documents ingested for GitHub repository: ${repo.name}`,
      );
    }

    return { totalDocumentsIngested };
  };

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

      // Determine the path exclusions to use for this repository or use global default
      const repositoryPathExclusions =
        repositoriesFilter?.find(
          r => r.name.toLowerCase() === repo.name.toLowerCase(),
        )?.pathExclusions ?? globalPathExclusions;

      logger.info(
        `Processing file types for repository ${
          repo.name
        }: [${repositoryFileTypesFilter.join(', ')}]`,
      );

      if (repositoryPathExclusions) {
        logger.info(
          `Using path exclusions for repository ${
            repo.name
          }: [${repositoryPathExclusions.join(', ')}]`,
        );
      }

      // Get the files to be ingested from the repository based on the file types filter
      let files = await githubService.getRepoFiles(
        repo.name,
        repositoryFileTypesFilter,
      );

      // Apply path exclusion filtering if configured
      if (repositoryPathExclusions) {
        const pathFilter = createPathFilter({
          exclusionPatterns: repositoryPathExclusions,
        });

        const originalFileCount = files.length;

        // Log excluded files for debugging
        const excludedFiles = files.filter(
          file => file.path && pathFilter.shouldExcludePath(file.path),
        );

        if (excludedFiles.length > 0) {
          logger.debug(
            `Files excluded from repository ${repo.name}: ${excludedFiles
              .map(f => f.path)
              .join(', ')}`,
          );
        }

        files = pathFilter.filterFiles(files);
        const filteredFileCount = originalFileCount - files.length;

        if (filteredFileCount > 0) {
          logger.info(
            `Filtered out ${filteredFileCount} files from repository ${repo.name} based on path exclusion patterns`,
          );
        }
      }

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

      const { totalDocumentsIngested } = await ingestRepositoryByFileBatch({
        repo,
        files,
        saveDocumentsBatch,
      });

      if (totalDocumentsIngested === 0) {
        logger.warn(
          `No documents were ingested and sent for embedding from the GitHub repository ${repo.name} (${repo.id})`,
        );
        continue;
      }

      logger.info(
        `Repository ingestion completed: ${totalDocumentsIngested} total documents ingested and sent for embedding for GitHub repository: ${repo.name}`,
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
