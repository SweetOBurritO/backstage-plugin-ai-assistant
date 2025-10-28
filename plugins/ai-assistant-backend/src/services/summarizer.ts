import { RootConfigService } from '@backstage/backend-plugin-api';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { DEFAULT_SUMMARY_PROMPT } from '../constants/prompts';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { CallbackHandler } from '@langfuse/langchain';
import { hasLangfuseCredentials } from '../utils/langfuse';

type SummarizerService = {
  summarize: (
    conversationMessages: Message[],
    summaryLength?: string,
  ) => Promise<string>;
};

type SummarizerServiceOptions = {
  config: RootConfigService;
  models: Model[];
};

export const createSummarizerService = async ({
  config,
  models,
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

  // Initialize Langfuse CallbackHandler for tracing if credentials are available
  const langfuseHandler = hasLangfuseCredentials()
    ? new CallbackHandler({
        userId: 'summarizer',
        tags: ['backstage-ai-assistant', 'summarizer'],
      })
    : undefined;

  const summaryPromptTemplate = SystemMessagePromptTemplate.fromTemplate(`
    PURPOSE:
    {summaryPrompt}
    Summarize the conversation in {summaryLength}

    Conversation:
    {conversation}
  `);

  const summarize: SummarizerService['summarize'] = async (
    messages,
    summaryLength = 'as few words as possible',
  ) => {
    const conversationMessages = messages.filter(
      msg => msg.role === 'ai' || msg.role === 'human',
    );

    const prompt = await summaryPromptTemplate.formatMessages({
      summaryPrompt,
      summaryLength,
      conversation: conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n'),
    });

    const invokeOptions: any = {
      runName: 'conversation-summarizer',
      tags: ['summarizer'],
    };

    if (langfuseHandler) {
      invokeOptions.callbacks = [langfuseHandler];
    }

    const { text } = await llm.invoke(prompt, invokeOptions);

    return text.trim();
  };

  return { summarize };
};
