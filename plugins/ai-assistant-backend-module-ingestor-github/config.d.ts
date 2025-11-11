/**
 * GitHub ingestor configuration
 * @visibility backend
 */
export interface Config {
  aiAssistant: {
    ingestors: {
      github: {
        /**
         * The GitHub organization or user name
         */
        owner: string;
        /**
         * GitHub App ID
         * @visibility backend
         */
        appId: string | number;
        /**
         * GitHub App private key
         * @visibility secret
         */
        privateKey: string;
        /**
         * GitHub App installation ID
         * @visibility backend
         */
        installationId: string | number;
        /**
         * Optional GitHub API base URL (for GitHub Enterprise). Defaults to https://api.github.com
         */
        baseUrl?: string;
        /**
         * Optional list of file types to ingest (e.g., .md, .json). Defaults to .md and .json if not specified.
         */
        fileTypes?: string[];
        /**
         * Optional batch size for processing files. Defaults to 50 files per batch if not specified.
         */
        filesBatchSize?: number;
        /**
         * Optional list of glob patterns to exclude files and directories from ingestion.
         * Patterns support glob syntax (e.g., **, *). Defaults to common build artifacts and dependencies if not specified.
         * Examples: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
         */
        pathExclusions?: string[];
        /**
         * Optional list of repositories to ingest. If not specified, all repositories for the owner will be ingested.
         */
        repositories?: {
          /**
           * The name of the repository to ingest
           */
          name: string;
          /**
           * Optional list of file types to ingest for this repository. Overrides the global fileTypes setting for this repository only.
           */
          fileTypes?: string[];
          /**
           * Optional list of glob patterns to exclude files and directories from ingestion for this repository.
           * Overrides the global pathExclusions setting for this repository only.
           */
          pathExclusions?: string[];
        }[];
      };
    };
  };
}
