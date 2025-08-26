import {
  Model,
  VectorStore,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { PromptBuilder } from './prompt';

type ChatServiceOptions = {
  models: Model[];
  logger: LoggerService;
  vectorStore: VectorStore;
  config: RootConfigService;
  promptBuilder: PromptBuilder;
};

type PromptOptions = {
  modelId: string;
  chatMessages: ChatMessage[];
};

type ChatMessage = {
  role: string;
  content: string;
};

type ChatService = {
  prompt: (options: PromptOptions) => Promise<string>;
  getAvailableModels: () => Promise<string[]>;
};

export const createChatService = async ({
  models,
  logger,
  vectorStore,
  promptBuilder,
}: ChatServiceOptions): Promise<ChatService> => {
  logger.info(`Available models: ${models.map(m => m.id).join(', ')}`);

  const getChatModelById = (id: string) => {
    return models.find(model => model.id === id)?.chatModel;
  };

  const prompt: ChatService['prompt'] = async ({
    modelId,
    chatMessages,
  }: PromptOptions) => {
    const model = getChatModelById(modelId);

    if (!model) {
      throw new Error(`Model with id ${modelId} not found`);
    }

    const userMessage = chatMessages[chatMessages.length - 1].content;
    const context = await vectorStore.similaritySearch(userMessage, {}, 4);

    console.log(`context:`, context);

    const promptMessages = promptBuilder.buildPrompt(chatMessages, context);

    const response = await model.invoke(promptMessages);

    return response.text;
  };

  const getAvailableModels: ChatService['getAvailableModels'] = async () => {
    return models.map(x => x.id);
  };

  return {
    prompt,
    getAvailableModels,
  };
};
