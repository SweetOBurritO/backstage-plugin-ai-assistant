export interface Config {
  aiAssistant?: {
    /**
     * Azure OpenAI Realtime voice configuration
     * @visibility backend
     */
    realtimeVoice?: {
      /**
       * Azure OpenAI configuration for Realtime API
       */
      azureOpenAi: {
        /**
         * Azure OpenAI API key (long-lived, server-side only)
         * @visibility secret
         */
        apiKey: string;

        /**
         * Azure OpenAI endpoint URL
         * Example: https://YOUR_RESOURCE.openai.azure.com
         */
        endpoint: string;

        /**
         * Azure OpenAI deployment name for realtime model
         * Must be a gpt-4o-realtime-preview deployment
         */
        deploymentName: string;

        /**
         * Azure OpenAI API version
         * @default 2024-10-01-preview
         */
        apiVersion?: string;
      };
    };
  };
}

