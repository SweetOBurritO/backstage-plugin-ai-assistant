export interface Config {
  aiAssistant: {
    embeddings: {
      ollama: {
        baseUrl: string;
        model: string;
        /**
         * @visibility secret
         */
        apiKey: string;
      };
    };
  };
}
