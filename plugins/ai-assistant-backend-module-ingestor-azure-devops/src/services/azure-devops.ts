import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { getPersonalAccessTokenHandler, WebApi } from 'azure-devops-node-api';
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/GitInterfaces';

export const createAzureDevOpsService = ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}) => {
  // Get configuration values
  const organization = config.getString(
    'aiAssistant.ingestors.azureDevOps.organization',
  );
  const project = config.getString('aiAssistant.ingestors.azureDevOps.project');
  const token = config.getString('aiAssistant.ingestors.azureDevOps.token');

  // Construct organization URL
  const orgUrl = `https://dev.azure.com/${organization}`;

  logger.info(
    `Connecting to Azure DevOps organization: ${organization}, project: ${project}`,
  );

  if (!organization || !project || !token) {
    throw new Error(
      'Azure DevOps organization, project, and token are required',
    );
  }

  // Create authentication handler and connection
  const authHandler = getPersonalAccessTokenHandler(token);

  const connection = new WebApi(orgUrl, authHandler);

  /**
   * Get a list of repositories in the specified Azure DevOps project
   * @returns List of repositories in the specified Azure DevOps project
   */
  const getRepos = async () => {
    const gitApi = await connection.getGitApi();

    const repos = await gitApi.getRepositories(project);

    logger.info(`Found ${repos.length} repositories in project ${project}`);

    return repos;
  };

  /**
   * Get a list of items in the specified Azure DevOps repository
   * @param repoId The ID of the repository
   * @param fileTypes Optional list of file types to filter by
   * @returns List of items in the specified Azure DevOps repository
   */
  const getRepoItems = async (repoId: string, fileTypes?: string[]) => {
    const gitApi = await connection.getGitApi();

    const items = await gitApi.getItems(
      repoId,
      project,
      undefined,
      VersionControlRecursionType.Full,
    );

    logger.info(
      `Found ${items.length} items in Azure DevOps repository ${repoId}`,
    );

    if (fileTypes && fileTypes.length > 0) {
      const filteredItems = items.filter(
        item =>
          !item.isFolder && fileTypes.some(type => item.path?.endsWith(type)),
      );
      logger.info(
        `Filtered to ${filteredItems.length} items with types: ${fileTypes.join(
          ', ',
        )}`,
      );
      return filteredItems;
    }

    return items;
  };

  /**
   * Get the content of a specific item in an Azure DevOps repository
   * @param repoId The ID of the repository
   * @param path The path of the item
   * @returns The content of the item
   */
  const getRepoItemContent = async (repoId: string, path: string) => {
    const gitApi = await connection.getGitApi();

    const itemContent = await gitApi.getItemContent(
      repoId,
      path,
      project,
      undefined,
      VersionControlRecursionType.None,
    );

    return itemContent;
  };

  return { organization, project, getRepos, getRepoItems, getRepoItemContent };
};
