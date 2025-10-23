export interface Config {
  aiAssistant: {
    embeddings: {
      azureOpenAi: {
        endpoint: string;
        deploymentName: string;
        instanceName: string;
        openAIApiVersion: string;
        /**
         * @visibility secret
         */
        apiKey: string;
      };
    };
  };
}
