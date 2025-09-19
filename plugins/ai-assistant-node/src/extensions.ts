import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { Ingestor } from './types/ingestor';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type DataIngestorExtensionPoint = {
  registerIngestor: (ingestor: Ingestor) => void;
};

export const dataIngestorExtensionPoint =
  createExtensionPoint<DataIngestorExtensionPoint>({
    id: 'ai-assistant.data-ingestor',
  });

export type EmbeddingsProvider = {
  getEmbeddings: () => Promise<Omit<Embeddings, 'caller'>>;
};

export type EmbeddingsProviderExtensionPoint = {
  register: (provider: EmbeddingsProvider) => void;
};

export const embeddingsProviderExtensionPoint =
  createExtensionPoint<EmbeddingsProviderExtensionPoint>({
    id: 'ai-assistant.embeddings-provider',
  });

export type Model = {
  id: string;
  chatModel: BaseChatModel;
};

export type ModelProviderExtensionPoint = {
  register: (model: Model) => void;
};

export const modelProviderExtensionPoint =
  createExtensionPoint<ModelProviderExtensionPoint>({
    id: 'ai-assistant.model-provider',
  });
