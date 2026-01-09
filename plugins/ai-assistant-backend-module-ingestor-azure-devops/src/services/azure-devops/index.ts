import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { streamToString } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { getPersonalAccessTokenHandler, WebApi } from 'azure-devops-node-api';
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';
import { flattenWikiPages } from '../../utils/flatten-wiki-pages';

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

    // Handle case where repository is empty or returns null
    if (!items || items.length === 0) {
      logger.info(`No items found in Azure DevOps repository ${repoId}`);
      return [];
    }

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

  /**
   * Get the last updated date for a specific item in an Azure DevOps repository
   * @param repoId The ID of the repository
   * @param path The path of the item
   * @returns The date when the item was last updated
   */
  const getRepoItemLastUpdated = async (repoId: string, path: string) => {
    const commits = await gitApi.getCommits(
      repoId,
      { itemPath: path, $top: 1 },
      project,
    );

    if (!commits || commits.length === 0) {
      throw new Error(`No commits found for item: ${path}`);
    }

    return commits[0].committer?.date;
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
   * @param pagePath The path of the page (e.g., "/My-Page" or "/Folder/Sub-Page")
   * @returns The content of the specified wiki page as plain markdown text
   */
  const getWikiPageContent = async (wikiName: string, pagePath: string) => {
    // Use getPageText with the page path to get raw markdown content
    // The path-based method with Accept: text/plain returns the actual markdown content
    const pageStream = await wikiApi.getPageText(
      project,
      wikiName,
      pagePath,
      VersionControlRecursionType.None,
    );

    return pageStream;
  };

  /**
   * Get the last updated date for a specific page in an Azure DevOps wiki
   * @param wikiId The ID of the wiki
   * @param pagePath The path of the page
   * @returns The date when the wiki page was last updated
   */
  const getWikiPageLastUpdated = async (wikiId: string, pagePath: string) => {
    // Wikis in Azure DevOps are backed by Git repositories
    // We need to get the wiki details first to access the repository
    const wikis = await wikiApi.getAllWikis(project);
    const wiki = wikis.find(w => w.id === wikiId);

    if (!wiki?.repositoryId) {
      throw new Error(`Could not find repository for wiki: ${wikiId}`);
    }

    // Use Git API to get the last commit for the wiki page file
    // Wiki pages are stored as .md files in the repository
    const filePath = pagePath.startsWith('/') ? pagePath.slice(1) : pagePath;
    const fullPath = filePath.endsWith('.md') ? filePath : `${filePath}.md`;

    const commits = await gitApi.getCommits(
      wiki.repositoryId,
      { itemPath: `/${fullPath}`, $top: 1 },
      project,
    );

    if (!commits || commits.length === 0) {
      throw new Error(`No commits found for wiki page: ${pagePath}`);
    }

    return commits[0].committer?.date;
  };

  return {
    organization,
    project,
    getRepos,
    getRepoItems,
    getRepoItemContent,
    getRepoItemLastUpdated,
    getWikis,
    getWikiPages,
    getWikiPageContent,
    getWikiPageLastUpdated,
  };
};
