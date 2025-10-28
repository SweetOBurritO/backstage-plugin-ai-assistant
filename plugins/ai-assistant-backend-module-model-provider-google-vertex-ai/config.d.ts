export interface Config {
  aiAssistant: {
    models: {
      googleVertexAi: {
        /**
         * @visibility secret
         */
        apiKey: string;
        models: string[];
      };
    };
  };
}
