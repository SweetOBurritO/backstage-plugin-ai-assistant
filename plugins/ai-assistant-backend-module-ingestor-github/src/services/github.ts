import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';

export const createGitHubService = async ({
  config,
  logger,
}: {
  config: RootConfigService;
  logger: LoggerService;
}) => {
  // Dynamic import for ESM-only octokit v5
  const { App } = await import('octokit');
  // Get configuration values
  const owner = config.getString('aiAssistant.ingestors.github.owner');
  const appId = config.getString('aiAssistant.ingestors.github.appId');
  const privateKey = config.getString(
    'aiAssistant.ingestors.github.privateKey',
  );
  const installationId = config.getNumber(
    'aiAssistant.ingestors.github.installationId',
  );
  const baseUrl = config.getOptionalString(
    'aiAssistant.ingestors.github.baseUrl',
  );

  logger.info(`Connecting to GitHub App for owner: ${owner}`);

  if (!owner || !appId || !privateKey || !installationId) {
    throw new Error(
      'GitHub owner, appId, privateKey, and installationId are required',
    );
  }

  // Create GitHub App instance
  const app = new App({
    appId,
    privateKey,
    ...(baseUrl && { baseUrl }),
  });

  // Get installation-specific Octokit instance
  const octokit = await app.getInstallationOctokit(installationId);

  logger.info(`Connected to GitHub App for owner: ${owner}`);

  /**
   * Get a list of repositories for the specified GitHub owner
   * @returns List of repositories for the specified GitHub owner
   */
  const getRepos = async () => {
    const { data: repositories } =
      await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

    // Filter repositories by owner if needed
    const repos = repositories.repositories.filter(
      repo => repo.owner?.login?.toLowerCase() === owner.toLowerCase(),
    );

    logger.info(`Found ${repos.length} repositories for owner ${owner}`);

    return repos;
  };

  /**
   * Get a list of files in the specified GitHub repository
   * @param repoName The name of the repository
   * @param fileTypes Optional list of file types to filter by
   * @returns List of files in the specified GitHub repository
   */
  const getRepoFiles = async (repoName: string, fileTypes?: string[]) => {
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo: repoName,
      tree_sha: 'HEAD',
      recursive: 'true',
    });

    // Filter to only files (not directories)
    const files = tree.tree.filter((item: any) => item.type === 'blob');

    logger.info(`Found ${files.length} files in GitHub repository ${repoName}`);

    if (fileTypes && fileTypes.length > 0) {
      const filteredFiles = files.filter((file: any) =>
        fileTypes.some(type => file.path?.endsWith(type)),
      );
      logger.info(
        `Filtered to ${filteredFiles.length} files with types: ${fileTypes.join(
          ', ',
        )}`,
      );
      return filteredFiles;
    }

    return files;
  };

  /**
   * Get the content of a specific file in a GitHub repository
   * @param repoName The name of the repository
   * @param path The path of the file
   * @returns The content of the file
   */
  const getRepoFileContent = async (repoName: string, path: string) => {
    const { data: fileContent } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path,
    });

    if (Array.isArray(fileContent)) {
      throw new Error(`Expected file but got directory for path: ${path}`);
    }

    if (!('content' in fileContent) || fileContent.type !== 'file') {
      throw new Error(
        `Expected file but got ${fileContent.type} for path: ${path}`,
      );
    }

    // Decode base64 content
    const content = Buffer.from(fileContent.content, 'base64').toString(
      'utf-8',
    );

    return content;
  };

  /**
   * Get the last updated date for a specific file
   * @param repoName The name of the repository
   * @param path The path of the file
   * @returns The date when the file was last updated
   */
  const getFileLastUpdated = async (repoName: string, path: string) => {
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo: repoName,
      path,
      per_page: 1,
    });

    if (commits.length === 0) {
      throw new Error(`No commits found for file: ${path}`);
    }

    return commits[0].commit.committer?.date;
  };

  return {
    owner,
    getRepos,
    getRepoFiles,
    getRepoFileContent,
    getFileLastUpdated,
  };
};
