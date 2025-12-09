import { coreServices, RootConfigService } from '@backstage/backend-plugin-api';
import { ModelService, modelServiceRef } from './model';
import {
  DEFAULT_CONVERSATION_SUMMARY_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
} from '../constants/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { CallbackService, callbackServiceRef } from './callbacks';
import {
  createServiceFactory,
  createServiceRef,
  ServiceRef,
} from '@backstage/backend-plugin-api';

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

export type SummarizerServiceOptions = {
  config: RootConfigService;
  model: ModelService;
  callback: CallbackService;
};

const createSummarizerService = async ({
  config,
  model,
  callback,
}: SummarizerServiceOptions): Promise<SummarizerService> => {
  const summaryModelId = config.getOptionalString(
    'aiAssistant.conversation.summaryModel',
  );

  const conversationSummaryPrompt =
    config.getOptionalString('aiAssistant.conversation.summaryPrompt') ??
    DEFAULT_CONVERSATION_SUMMARY_PROMPT;

  const summaryPromptTemplate = PromptTemplate.fromTemplate(`
    PURPOSE:
    {summaryPrompt}

    Summarize the following content in {length}.

    Content:
    {content}
  `);

  const summarize: SummarizerService['summarize'] = async ({
    content,
    length = 'as few words as possible',
    prompt: summaryPrompt = DEFAULT_SUMMARY_PROMPT,
  }) => {
    const { id, chatModel: llm } = model.getModel(summaryModelId ?? 'default');

    const prompt = await summaryPromptTemplate.format({
      summaryPrompt,
      content,
      length,
    });

    const { callbacks } = await callback.getChainCallbacks({
      conversationId: 'summarizer',
      userId: 'system',
      modelId: id,
    });

    const { metadata } = await callback.getChainMetadata({
      conversationId: 'summarizer',
      userId: 'system',
      modelId: id,
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

export const summarizerServiceRef: ServiceRef<
  SummarizerService,
  'plugin',
  'singleton'
> = createServiceRef<SummarizerService>({
  id: 'ai-assistant.summarizer-service',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        config: coreServices.rootConfig,
        callback: callbackServiceRef,
        model: modelServiceRef,
      },
      factory: async options => {
        return createSummarizerService(options);
      },
    }),
});
