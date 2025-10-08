import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  EmbeddingDocument,
  IngestorOptions,
  streamToString,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { AzureDevOpsService } from '../azure-devops';
import { Config } from '../../../config';
import { MODULE_ID } from '../../constants/module';
import { getProgressStats } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { DEFAULT_WIKI_PAGE_BATCH_SIZE } from '../../constants/default-wiki-page-batch-size';
import {
  WikiPage,
  WikiV2,
} from 'azure-devops-node-api/interfaces/WikiInterfaces';

type WikiIngestorOptions = {
  config: RootConfigService;
  logger: LoggerService;
  azureDevOpsService: AzureDevOpsService;
};

export const createWikiIngestor = async ({
  config,
  logger,
  azureDevOpsService,
}: WikiIngestorOptions) => {
  // Get configuration values
  const wikisFilter = config.getOptional<
    Config['aiAssistant']['ingestors']['azureDevOps']['wikis']
  >('aiAssistant.ingestors.azureDevOps.wikis');

  // Get batch size for processing pages (default to 50 pages per batch)
  const pagesBatchSize =
    config.getOptionalNumber(
      'aiAssistant.ingestors.azureDevOps.pagesBatchSize',
    ) ?? DEFAULT_WIKI_PAGE_BATCH_SIZE;

  /** Ingest Azure DevOps wiki pages in batches
   * @param wiki - The wiki to ingest pages from
   * @param pages - The list of pages to ingest from the wiki
   * @param saveDocumentsBatch - Function to save a batch of embedding documents
   * @returns Total number of documents ingested and sent for embedding from the wiki
   */
  const ingestWikiByPageBatch = async ({
    wiki,
    pages,
    saveDocumentsBatch,
  }: {
    wiki: WikiV2;
    pages: WikiPage[];
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'];
  }) => {
    logger.info(
      `Processing ${pages.length} pages from wiki "${wiki.name}" in batches of ${pagesBatchSize}`,
    );

    let totalDocumentsIngested = 0;

    // Process pages in batches to manage memory and performance

    // Calculate total number of batches
    const totalBatches = Math.ceil(pages.length / pagesBatchSize);

    // Process each batch
    for (
      let batchStart = 0;
      batchStart < pages.length;
      batchStart += pagesBatchSize
    ) {
      const batchEnd = Math.min(batchStart + pagesBatchSize, pages.length);
      const pagesBatch = pages.slice(batchStart, batchEnd);
      const batchNumber = Math.floor(batchStart / pagesBatchSize) + 1;

      logger.info(
        `Processing batch ${batchNumber}/${totalBatches} (${pagesBatch.length} pages) for wiki "${wiki.name}"`,
      );

      // Generate embedding documents for each page in the current batch
      const documents: EmbeddingDocument[] = [];

      for (let index = 0; index < pagesBatch.length; index++) {
        const page = pagesBatch[index];
        const globalIndex = batchStart + index;

        const content = await azureDevOpsService.getWikiPageContent(
          wiki.id!,
          page.id!,
        );

        const completionStats = getProgressStats(globalIndex + 1, pages.length);

        logger.info(
          `Retrieved content for Azure DevOps page: "${page.path}" in wiki: "${wiki.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of wiki]`,
        );

        const text = await streamToString(content);

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${wiki.id}:${page.path}`,
            url: page.url ?? '',
            organization: azureDevOpsService.organization,
            project: azureDevOpsService.project,
            wiki: wiki.name!,
          },
          content: text,
        };

        documents.push(document);
      }

      // Save the current batch of documents
      await saveDocumentsBatch(documents);

      totalDocumentsIngested += documents.length;

      logger.info(
        `Batch ${batchNumber}/${totalBatches} completed: ${documents.length} documents ingested for Azure DevOps wiki: ${wiki.name}`,
      );
    }

    return { totalDocumentsIngested };
  };

  /** Ingest Azure DevOps wikis in batches */
  const ingestWikisBatch = async (
    saveDocumentsBatch: IngestorOptions['saveDocumentsBatch'],
  ) => {
    const wikisList = await azureDevOpsService.getWikis();

    if (wikisList.length === 0) {
      logger.warn('No wikis found in the Azure DevOps project');
      return;
    }

    logger.info(
      `Filtering for wikis: ${wikisFilter?.map(repo => repo.name).join(', ')}`,
    );

    // Filter wikis if a filter is provided in the config
    const wikisToIngest = wikisFilter
      ? wikisList.filter(wiki =>
          wikisFilter?.some(
            filteredWiki =>
              filteredWiki.name.toLowerCase() === wiki.name!.toLowerCase(),
          ),
        )
      : wikisList;

    if (wikisToIngest.length === 0) {
      logger.warn('No wikis found for ingestion after applying the filter');
      return;
    }

    logger.info(`Ingesting ${wikisToIngest.length} wikis from Azure DevOps`);

    // Get items from each wiki and create documents to be embedded
    for (const wiki of wikisToIngest) {
      logger.info(`Beginning ingestion for wiki: ${wiki.name} (${wiki.id})`);

      // Get the pages to be ingested from the wiki based on the file types filter
      const pages = await azureDevOpsService.getWikiPages(wiki.id!);

      if (pages.length === 0) {
        logger.warn(
          `No pages found for ingestion in the Azure DevOps wiki ${wiki.name} (${wiki.id})`,
        );
        continue;
      }

      const { totalDocumentsIngested } = await ingestWikiByPageBatch({
        wiki,
        pages,
        saveDocumentsBatch,
      });

      if (totalDocumentsIngested === 0) {
        logger.warn(
          `No documents were ingested and sent for embedding from the Azure DevOps wiki ${wiki.name} (${wiki.id})`,
        );
        continue;
      }

      logger.info(
        `Wiki ingestion completed: ${totalDocumentsIngested} total documents ingested and sent for embedding for Azure DevOps wiki: ${wiki.name}`,
      );
    }
  };

  return { ingestWikisBatch };
};
