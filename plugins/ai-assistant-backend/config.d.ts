import { HumanDuration } from '@backstage/types';
import { SchedulerServiceTaskScheduleDefinitionConfig } from '@backstage/backend-plugin-api';

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
    };
  };
}
