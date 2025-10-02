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
         * Optional list of repositories to ingest. If not specified, all repositories in the project will be ingested.
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
        }[];

        /**
         * Optional list of wikis to ingest. If not specified, all wikis in the project will be ingested.
         */
        wikis?: {
          /**
           * The name of the wiki to ingest
           */
          name: string;
          /**
           * Optional list of file types to ingest for this wiki. Overrides the global fileTypes setting for this wiki only.
           */
          fileTypes?: string[];
        }[];

        /**
         * Optional batch size for processing wiki pages. Defaults to 50 pages per batch.
         * Lower values use less memory but may be slower, higher values are faster but use more memory.
         */
        pagesBatchSize?: number;
      };
    };
  };
}
