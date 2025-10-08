import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { createAzureDevOpsService } from '../azure-devops';
import { Ingestor } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../../constants/module';
import { createRepositoryIngestor } from './repository';
import { createWikiIngestor } from './wiki';
import { Config } from '../../../config';

export const createAzureDevOpsIngestor = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}): Promise<Ingestor> => {
  // Get configuration values
  const resourceTypes = config.get<
    Config['aiAssistant']['ingestors']['azureDevOps']['resourceTypes']
  >('aiAssistant.ingestors.azureDevOps.resourceTypes');

  // Create Azure DevOps service
  const azureDevOpsService = await createAzureDevOpsService({ config, logger });

  // Create repository ingestor
  const repositoryIngestor = await createRepositoryIngestor({
    config,
    logger,
    azureDevOpsService,
  });

  // Create wiki ingestor
  const wikiIngestor = await createWikiIngestor({
    config,
    logger,
    azureDevOpsService,
  });

  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    if (resourceTypes.includes('repository')) {
      logger.info('Initializing Azure DevOps repository resource ingestor');
      await repositoryIngestor.ingestRepositoriesBatch(saveDocumentsBatch);
    }
    if (resourceTypes.includes('wiki')) {
      logger.info('Initializing Azure DevOps wiki resource ingestor');
      await wikiIngestor.ingestWikisBatch(saveDocumentsBatch);
    }
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
