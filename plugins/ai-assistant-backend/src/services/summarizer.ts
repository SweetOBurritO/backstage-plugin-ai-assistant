import {
  coreServices,
  RootConfigService,
  AuthService,
} from '@backstage/backend-plugin-api';
import { AgentService, agentServiceRef } from './agent';

import {
  DEFAULT_CONVERSATION_SUMMARY_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
} from '../constants/prompts';
import { PromptTemplate } from '@langchain/core/prompts';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import {
  createServiceFactory,
  createServiceRef,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import { v4 as uuid } from 'uuid';

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
  agent: AgentService;
  auth: AuthService;
};

const createSummarizerService = async ({
  config,
  agent,
  auth,
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
  `);

  const summarize: SummarizerService['summarize'] = async ({
    content,
    length = 'as few words as possible',
    prompt: summaryPrompt = DEFAULT_SUMMARY_PROMPT,
  }) => {
    const prompt = await summaryPromptTemplate.format({
      summaryPrompt,
      content,
      length,
    });

    const credentials = await auth.getOwnServiceCredentials();

    const messages = await agent.prompt({
      messages: [{ role: 'system', content, score: 0, metadata: {} }],
      metadata: {
        conversationId: 'summarizer',
        userId: 'system:summarizer',
        runId: uuid(),
        runName: 'summarizer',
      },
      systemPrompt: prompt,
      modelId: summaryModelId,
      credentials,
      tools: [],
    });

    const aiMessages = messages.filter(m => m.role === 'ai');

    if (aiMessages.length === 0) {
      throw new Error('Failed to summarize content');
    }

    const response = messages.pop()!;

    return response.content.trim();
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
        agent: agentServiceRef,
        auth: coreServices.auth,
      },
      factory: async options => {
        return createSummarizerService(options);
      },
    }),
});
