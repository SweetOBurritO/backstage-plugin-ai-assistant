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

      logger.debug(`Pages: ${JSON.stringify(pages, null, 2)}`);

      // Generate embedding documents for each page
      const documents: EmbeddingDocument[] = [];

      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];

        const content = await azureDevOpsService.getWikiPageContent(
          wiki.id!,
          page.id!,
        );

        const completionStats = {
          percentage: Math.round(((index + 1) / pages.length) * 100),
          current: index + 1,
          total: pages.length,
        };

        logger.info(
          `Retrieved content for Azure DevOps page: "${page.path}" in wiki: "${wiki.name}" [${completionStats.current}/${completionStats.total} (${completionStats.percentage}%) completed of wiki]`,
        );

        const text = await streamToString(content);

        const document: EmbeddingDocument = {
          metadata: {
            source: MODULE_ID,
            id: `${page.id}:${page.path}`,
            url: page.url,
            organization: azureDevOpsService.organization,
            project: azureDevOpsService.project,
            wiki: wiki.name!,
          },
          content: text,
        };

        documents.push(document);
      }

      // Save the documents in batches
      await saveDocumentsBatch(documents);

      logger.info(
        `${documents.length} documents ingested for Azure DevOps wiki: ${wiki.name}`,
      );
    }
  };

  return { ingestWikisBatch };
};
