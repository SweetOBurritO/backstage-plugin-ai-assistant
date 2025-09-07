export interface Config {
  aiAssistant: {
    embeddings: {
      azureOpenAi: {
        endpoint: string;
        deploymentName: string;
        instanceName: string;
        /**
         * @visibility secret
         */
        apiKey: string;
      };
    };
  };
}
