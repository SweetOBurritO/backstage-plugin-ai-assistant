import { HumanDuration } from '@backstage/types';
import { SchedulerServiceTaskScheduleDefinitionConfig } from '@backstage/backend-plugin-api';
import { McpServerConfig } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export interface Config {
  aiAssistant: {
    prompt?: {
      system?: string;
      prefix?: string;
      suffix?: string;
    };
    conversation?: {
      summaryModel?: string;
      summaryPrompt?: string;
    };
    storage?: {
      pgVector?: {
        /**
         * The size of the chunk to flush when storing embeddings to the DB
         */
        chunkSize?: number;

        /**
         * The default amount of embeddings to return when querying vectors with similarity search
         */
        amount?: number;
      };
    };
    ingestion?: {
      schedule?: SchedulerServiceTaskScheduleDefinitionConfig;
      chunking?: {
        /**
         * The size of text chunks to split documents into during ingestion
         */
        chunkSize?: number;

        /**
         * The amount of overlap between text chunks during ingestion
         */
        chunkOverlap?: number;

        /**
         * The maximum number of chunks to process in a single batch when ingesting documents
         */
        maxChunkProcessingSize?: number;
      };
    };
    tools?: {
      /**
       * List of tools that should always be enabled and not user-toggleable.
       *
       * For MCP tools, provider format is: `mcp server:<server-name>`.
       */
      core?: Array<{
        provider: string;
        name: string;
      }>;

      /**
       * List of tools enabled by default for users that don't have existing
       * `user-tools` settings.
       *
       * For MCP tools, provider format is: `mcp server:<server-name>`.
       */
      defaultEnabled?: Array<{
        provider: string;
        name: string;
      }>;
    };
    mcp: {
      /**
       * @visibility secret
       */
      encryptionKey: string;
      servers?: Array<McpServerConfig>;
    };
  };
}
