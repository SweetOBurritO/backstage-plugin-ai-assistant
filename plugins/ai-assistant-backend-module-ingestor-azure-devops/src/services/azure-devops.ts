import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { streamToString } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { getPersonalAccessTokenHandler, WebApi } from 'azure-devops-node-api';
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';
import { flattenWikiPages } from '../utils/flatten-wiki-pages';

export type AzureDevOpsService = Awaited<
  ReturnType<typeof createAzureDevOpsService>
>;

export const createAzureDevOpsService = async ({
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

  logger.info(
    `Connected to Azure DevOps organization: ${organization}, project: ${project}`,
  );

  // Get Git API for repository operations
  const gitApi = await connection.getGitApi();

  // Get Wiki API for wiki operations
  const wikiApi = await connection.getWikiApi();

  /**
   * Get a list of repositories in the specified Azure DevOps project
   * @returns List of repositories in the specified Azure DevOps project
   */
  const getRepos = async () => {
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
    const itemContent = await gitApi.getItemContent(
      repoId,
      path,
      project,
      undefined,
      VersionControlRecursionType.None,
    );

    return itemContent;
  };

  /* Gets all wikis in the specified Azure DevOps project */
  const getWikis = async () => {
    const wikis = await wikiApi.getAllWikis(project);
    logger.info(`Found ${wikis.length} wikis in project ${project}`);
    return wikis;
  };

  /**
   * Retrieves all pages and subpages in a specific Azure DevOps wiki and flattens them into a single list
   * @param wikiName The name of the wiki to get pages from
   * @returns A list of all pages in the specified wiki
   */
  const getWikiPages = async (wikiName: string) => {
    const pagesStream = await wikiApi.getPageText(
      project,
      wikiName,
      undefined,
      VersionControlRecursionType.Full,
    );

    const rootPage = JSON.parse(await streamToString(pagesStream)) as WikiPage;

    // Flatten all pages including subpages into a single array
    const allPages = flattenWikiPages(rootPage);

    logger.info(
      `Found ${allPages.length} pages in Azure DevOps wiki: ${wikiName}`,
    );

    return allPages;
  };

  /**
   * Get the content of a specific page in an Azure DevOps wiki
   * @param wikiName The name of the wiki
   * @param pageId The ID of the page
   * @returns The content of the specified wiki page
   */
  const getWikiPageContent = async (wikiName: string, pageId: number) => {
    const pageStream = await wikiApi.getPageByIdText(
      project,
      wikiName,
      pageId,
      VersionControlRecursionType.None,
      true,
    );

    const pageContent = await streamToString(pageStream);

    return pageContent;
  };

  return {
    organization,
    project,
    getRepos,
    getRepoItems,
    getRepoItemContent,
    getWikis,
    getWikiPages,
    getWikiPageContent,
  };
};
