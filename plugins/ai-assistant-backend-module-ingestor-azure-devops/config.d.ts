/**
 * Azure DevOps ingestor configuration
 * @visibility backend
 */
export interface Config {
  aiAssistant: {
    ingestors: {
      azureDevOps: {
        /**
         * The Azure DevOps organization name
         */
        organization: string;
        /**
         * The Azure DevOps project name
         */
        project: string;
        /**
         * Personal Access Token for Azure DevOps
         * @visibility secret
         */
        token: string;
        /**
         * The types of resources to ingest from Azure DevOps
         * Currently supports 'repository' and 'wiki' resources
         */
        resourceTypes: ('repository' | 'wiki')[];
        /**
         * Optional list of file types to ingest (e.g., .md, .json). Defaults to .md and .json if not specified.
         */
        fileTypes?: string[];
        /**
         * Optional configuration for filtering repositories to ingest.
         * If not specified, all repositories in the project will be ingested.
         * Supports both exact name matching and regex patterns for flexible filtering.
         */
        repositories?: {
          /**
           * List of repositories to include for ingestion.
           * If specified, only repositories matching these criteria will be ingested (unless excluded).
           */
          include?: {
            /**
             * Repository name or regular expression pattern.
             * All values are treated as regex patterns for matching:
             * - Plain strings (e.g., 'my-repo') match exactly that string (case-sensitive)
             * - Regex patterns (e.g., '^backend-.*', '.*-service$') match using regex rules
             * Examples:
             *   - 'backend-api' matches only 'backend-api'
             *   - '^backend-.*' matches 'backend-api', 'backend-service', etc.
             *   - '(?i)my-repo' for case-insensitive matching
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
          /**
           * List of repositories to exclude from ingestion.
           * Exclusions are applied after inclusions.
           */
          exclude?: {
            /**
             * Repository name or regular expression pattern to exclude.
             * All values are treated as regex patterns for matching:
             * - Plain strings (e.g., 'test-repo') match exactly that string (case-sensitive)
             * - Regex patterns (e.g., '^test-.*', '.*-archived$') match using regex rules
             * Examples:
             *   - 'temp-repo' matches only 'temp-repo'
             *   - '^test-.*' matches 'test-api', 'test-service', etc.
             *   - '(?i)archived' for case-insensitive matching
             */
            name: string;
          }[];
        };
        /**
         * Optional batch size for processing repository files. Defaults to 50 files per batch.
         * Lower values use less memory but may be slower, higher values are faster but use more memory.
         */
        filesBatchSize?: number;
        /**
         * Optional list of glob patterns to exclude files and directories from ingestion.
         * Patterns support glob syntax (e.g., **, *). Defaults to common build artifacts and dependencies if not specified.
         * Examples: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
         */
        pathExclusions?: string[];

        /**
         * Optional configuration for filtering wikis to ingest.
         * If not specified, all wikis in the project will be ingested.
         * Supports both exact name matching and regex patterns for flexible filtering.
         */
        wikis?: {
          /**
           * List of wikis to include for ingestion.
           * If specified, only wikis matching these criteria will be ingested (unless excluded).
           */
          include?: {
            /**
             * Wiki name or regular expression pattern.
             * All values are treated as regex patterns for matching:
             * - Plain strings (e.g., 'my-wiki') match exactly that string (case-sensitive)
             * - Regex patterns (e.g., '^prod-.*', '.*-docs$') match using regex rules
             * Examples:
             *   - 'production-wiki' matches only 'production-wiki'
             *   - '^prod-.*' matches 'prod-wiki', 'prod-docs', etc.
             *   - '(?i)docs' for case-insensitive matching
             */
            name: string;
          }[];
          /**
           * List of wikis to exclude from ingestion.
           * Exclusions are applied after inclusions.
           */
          exclude?: {
            /**
             * Wiki name or regular expression pattern to exclude.
             * All values are treated as regex patterns for matching:
             * - Plain strings (e.g., 'draft-wiki') match exactly that string (case-sensitive)
             * - Regex patterns (e.g., '^draft-.*', '.*-test$') match using regex rules
             * Examples:
             *   - 'temp-wiki' matches only 'temp-wiki'
             *   - '^draft-.*' matches 'draft-docs', 'draft-notes', etc.
             *   - '(?i)test' for case-insensitive matching
             */
            name: string;
          }[];
        };

        /**
         * Optional batch size for processing wiki pages. Defaults to 50 pages per batch.
         * Lower values use less memory but may be slower, higher values are faster but use more memory.
         */
        pagesBatchSize?: number;
      };
    };
  };
}
