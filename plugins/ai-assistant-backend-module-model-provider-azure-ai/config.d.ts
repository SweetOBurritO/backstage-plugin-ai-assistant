export interface Config {
  aiAssistant: {
    models: {
      azureAiInference: {
        /**
         * @visibility secret
         */
        apiKey: string;
        models: {
          modelName: string;
          endpoint: string;
        };
      };
    };
  };
}
