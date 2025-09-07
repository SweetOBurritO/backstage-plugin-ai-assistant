export interface Config {
  aiAssistant: {
    embeddings: {
      azureOpenAi: {
        endpoint: string;
        deployment: string;
        /**
         * @visibility secret
         */
        apiKey: string;
      };
    };
  };
}
