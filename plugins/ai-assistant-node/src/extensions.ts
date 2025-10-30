import { createExtensionPoint } from '@backstage/backend-plugin-api';
import { Ingestor } from './types/ingestor';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Tool } from './types';
import { ZodType } from 'zod';

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

export type ToolExtensionPoint = {
  register: (tool: Tool<ZodType>) => void;
};

export const toolExtensionPoint = createExtensionPoint<ToolExtensionPoint>({
  id: 'ai-assistant.tool',
});

export type RealtimeVoiceService = {
  initialize: (options: { tools: Tool<ZodType>[] }) => void;
};

export type RealtimeVoiceExtensionPoint = {
  register: (service: RealtimeVoiceService) => void;
};

export const realtimeVoiceExtensionPoint =
  createExtensionPoint<RealtimeVoiceExtensionPoint>({
    id: 'ai-assistant.realtime-voice',
  });

