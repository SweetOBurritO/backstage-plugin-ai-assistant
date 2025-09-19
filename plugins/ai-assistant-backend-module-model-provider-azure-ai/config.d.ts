import { SdkType } from './src/types/chat-model';

export interface Config {
  aiAssistant: {
    models: {
      azureAi: {
        /**
         * @visibility secret
         */
        apiKey: string;
        models: {
          modelName: string;
          endpoint: string;
          sdk?: SdkType;
        }[];
      };
    };
  };
}
