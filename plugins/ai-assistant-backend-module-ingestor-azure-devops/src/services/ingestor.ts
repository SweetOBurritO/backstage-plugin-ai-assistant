import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { createAzureDevOpsService } from './azure-devops';
import { Ingestor } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { MODULE_ID } from '../constants/module';
import { createRepositoryIngestor } from './ingestor/repository';

export const createAzureDevOpsIngestor = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}): Promise<Ingestor> => {
  // Create Azure DevOps service
  const azureDevOpsService = await createAzureDevOpsService({ config, logger });

  // Create repository ingestor
  const repositoryIngestor = await createRepositoryIngestor({
    config,
    logger,
    azureDevOpsService,
  });

  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    await repositoryIngestor.ingestRepositoriesBatch(saveDocumentsBatch);
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
