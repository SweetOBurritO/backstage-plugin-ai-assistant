import { RootConfigService } from '@backstage/backend-plugin-api';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { DEFAULT_SUMMARY_PROMPT } from '../constants/prompts';
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from '@langchain/core/prompts';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { CallbackService } from './callbacks';

type SummarizerService = {
  summarize: (
    conversationMessages: Message[],
    summaryLength?: string,
  ) => Promise<string>;
};

type SummarizerServiceOptions = {
  config: RootConfigService;
  models: Model[];
  callback: CallbackService;
};

export const createSummarizerService = async ({
  config,
  models,
  callback,
}: SummarizerServiceOptions): Promise<SummarizerService> => {
  const summaryModelId =
    config.getOptionalString('aiAssistant.conversation.summaryModel') ??
    models[0].id;

  const summaryPrompt =
    config.getOptionalString('aiAssistant.conversation.summaryPrompt') ??
    DEFAULT_SUMMARY_PROMPT;

  const model = models.find(m => m.id === summaryModelId);

  if (!model) {
    throw new Error(`Summary model with id ${summaryModelId} not found`);
  }

  const llm = model.chatModel;

  const chatPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      PURPOSE:
      {summaryPrompt}

      Please summarize the following conversation in {summaryLength}.
    `),
    HumanMessagePromptTemplate.fromTemplate(`
      Conversation:
      {conversation}

      Please provide a summary of this conversation.
    `),
  ]);

  const summarize: SummarizerService['summarize'] = async (
    messages,
    summaryLength = 'as few words as possible',
  ) => {
    const conversationMessages = messages.filter(
      msg => msg.role === 'ai' || msg.role === 'human',
    );

    const prompt = await chatPromptTemplate.formatMessages({
      summaryPrompt,
      summaryLength,
      conversation: conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n'),
    });

    const { callbacks, metadata } = await callback.getAgentCallbackData({
      conversationId: 'summarizer',
      userId: 'system',
      modelId: summaryModelId,
    });

    const { text } = await llm.invoke(prompt, {
      callbacks,
      runName: 'summarizer',
      metadata,
    });

    return text.trim();
  };

  return { summarize };
};
