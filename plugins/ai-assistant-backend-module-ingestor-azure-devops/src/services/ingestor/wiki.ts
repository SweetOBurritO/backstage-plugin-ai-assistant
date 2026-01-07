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

  // Process and validate wiki filters
  type WikiMatcher = {
    value: string;
    regex: RegExp;
  };

  const includeMatchers: WikiMatcher[] = [];
  const excludeMatchers: WikiMatcher[] = [];

  if (wikisFilter?.include) {
    for (const filter of wikisFilter.include) {
      try {
        // All strings are treated as regex patterns; escape special characters for exact literal matches
        const regex = new RegExp(filter.name);
        includeMatchers.push({
          value: filter.name,
          regex,
        });
      } catch (error) {
        logger.error(
          `Invalid regular expression in wiki include '${filter.name}': ${error}`,
        );
        throw new Error(
          `Invalid wiki include pattern '${filter.name}': ${error}`,
        );
      }
    }
  }

  if (wikisFilter?.exclude) {
    for (const filter of wikisFilter.exclude) {
      try {
        // All strings are valid regex - plain strings match exactly, patterns match as regex
        const regex = new RegExp(filter.name);
        excludeMatchers.push({
          value: filter.name,
          regex,
        });
      } catch (error) {
        logger.error(
          `Invalid regular expression in wiki exclude '${filter.name}': ${error}`,
        );
        throw new Error(
          `Invalid wiki exclude pattern '${filter.name}': ${error}`,
        );
      }
    }
  }

  if (includeMatchers.length > 0) {
    logger.info(
      `Wiki include filters: ${includeMatchers
        .map(m => `'${m.value}'`)
        .join(', ')}`,
    );
  }
  if (excludeMatchers.length > 0) {
    logger.info(
      `Wiki exclude filters: ${excludeMatchers
        .map(m => `'${m.value}'`)
        .join(', ')}`,
    );
  }

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
          page.path!,
        );

        const completionStats = getProgressStats(globalIndex + 1, pages.length);

        logger.info(
          `Retrieved content for Azure DevOps page: "${page.path}" in wiki: "${wiki.name}" [Progress: ${completionStats.completed}/${completionStats.total} (${completionStats.percentage}%) completed of wiki]`,
        );

        // The API returns plain markdown text directly
        const pageContent = await streamToString(content);

        logger.debug(
          `Raw response for page "${page.path}" (length: ${pageContent.length})`,
        );
        // Use remoteUrl which points to the user-facing wiki page, not the API endpoint
        const pageUrl = page.remoteUrl || page.url!;

        // Check if we have actual content (not empty or just whitespace)
        if (!pageContent || pageContent.trim().length === 0) {
          logger.warn(
            `No content found for Azure DevOps page: "${page.path}" in wiki: "${wiki.name}". Skipping.`,
          );
          continue;
        }

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${wiki.id}:${page.path}`,
            url: pageUrl,
            organization: azureDevOpsService.organization,
            project: azureDevOpsService.project,
            wiki: wiki.name!,
          },
          content: pageContent,
        };

        logger.debug(
          `Created embedding document for Azure DevOps page: "${page.path}" in wiki: "${wiki.name}" content length: "${document.content.length}", page url: "${document.metadata.url}"`,
        );

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

    // Filter wikis using matchers
    let wikisToIngest = wikisList;

    // If include matchers exist, only include wikis that match at least one
    if (includeMatchers.length > 0) {
      logger.info(
        `Include filter found. Only including wikis matching the following patterns for ingestion: ${includeMatchers
          .map(m => `'${m.value}'`)
          .join(', ')}`,
      );

      wikisToIngest = wikisToIngest.filter(wiki => {
        return includeMatchers.some(matcher => matcher.regex!.test(wiki.name!));
      });
    }

    // Apply exclusions
    if (excludeMatchers.length > 0) {
      logger.info(
        `Exclude filter found. Excluding wikis matching the following patterns from ingestion: ${excludeMatchers
          .map(m => `'${m.value}'`)
          .join(', ')}`,
      );

      const excludedWikis = wikisToIngest.filter(wiki => {
        return excludeMatchers.some(matcher => matcher.regex!.test(wiki.name!));
      });

      if (excludedWikis.length > 0) {
        logger.info(
          `Excluding wikis: ${excludedWikis.map(w => w.name).join(', ')}`,
        );
      }
      wikisToIngest = wikisToIngest.filter(wiki => {
        return !excludeMatchers.some(matcher =>
          matcher.regex!.test(wiki.name!),
        );
      });
    }

    if (wikisToIngest.length === 0) {
      logger.warn('No wikis found for ingestion after applying the filter');
      return;
    }

    logger.debug(
      `Wikis to ingest: ${wikisToIngest.map(w => w.name).join(', ')}`,
    );

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
