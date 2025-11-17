import { RootConfigService } from '@backstage/backend-plugin-api';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  DEFAULT_CONVERSATION_SUMMARY_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
} from '../constants/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { CallbackService } from './callbacks';

export type SummarizerService = {
  summarizeConversation: (options: {
    messages: Message[];
    length?: string;
  }) => Promise<string>;

  summarize: (options: {
    content: string;
    prompt?: string;
    length?: string;
  }) => Promise<string>;
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

  const conversationSummaryPrompt =
    config.getOptionalString('aiAssistant.conversation.summaryPrompt') ??
    DEFAULT_CONVERSATION_SUMMARY_PROMPT;

  const model = models.find(m => m.id === summaryModelId);

  if (!model) {
    throw new Error(`Summary model with id ${summaryModelId} not found`);
  }

  const llm = model.chatModel;

  const summaryPromptTemplate = PromptTemplate.fromTemplate(`
    PURPOSE:
    {summaryPrompt}

    Summarize the following content in {length}.

    Content:
    {content}
  `);

  const summarize: SummarizerService['summarize'] = async (
    content,
    summaryPrompt = DEFAULT_SUMMARY_PROMPT,
    length = 'as few words as possible',
  ) => {
    const prompt = await summaryPromptTemplate.format({
      summaryPrompt,
      content,
      length,
    });

    const { callbacks } = await callback.getChainCallbacks({
      conversationId: 'summarizer',
      userId: 'system',
      modelId: summaryModelId,
    });

    const { metadata } = await callback.getChainMetadata({
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

  const summarizeConversation: SummarizerService['summarizeConversation'] =
    async ({ messages, length = 'as few words as possible' }) => {
      const conversationMessages = messages.filter(
        msg => msg.role === 'ai' || msg.role === 'human',
      );

      const conversation = conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      return summarize({
        content: conversation,
        prompt: conversationSummaryPrompt,
        length,
      });
    };

  return { summarizeConversation, summarize };
};
