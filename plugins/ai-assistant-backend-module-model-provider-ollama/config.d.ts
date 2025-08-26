export interface Config {
  aiAssistant: {
    models?: {
      ollama?: {
        baseUrl: string;
        apiKey: string;
        models: string[];
      };
    };
  };
}
