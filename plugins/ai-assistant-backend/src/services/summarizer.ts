import {
  RootConfigService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import {
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_PAGE_SUMMARY_PROMPT,
} from '../constants/prompts';
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from '@langchain/core/prompts';
import { cleanPageContent } from '../utils/content-cleaner';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { CallbackHandler } from '@langfuse/langchain';

type SummarizerService = {
  summarize: (
    conversationMessages: Message[],
    summaryLength?: string,
  ) => Promise<string>;
  summarizePage: (
    pageContent: string,
    pageUrl?: string,
    pageTitle?: string,
    summaryLength?: string,
  ) => Promise<string>;
};

type SummarizerServiceOptions = {
  config: RootConfigService;
  models: Model[];
  langfuseEnabled: boolean;
  logger: LoggerService;
};

export const createSummarizerService = async ({
  config,
  models,
  langfuseEnabled,
  logger,
}: SummarizerServiceOptions): Promise<SummarizerService> => {
  const summaryModelId =
    config.getOptionalString('aiAssistant.conversation.summaryModel') ??
    models[0].id;

  const summaryPrompt =
    config.getOptionalString('aiAssistant.conversation.summaryPrompt') ??
    DEFAULT_SUMMARY_PROMPT;

  const pageSummaryPrompt =
    config.getOptionalString('aiAssistant.page.summaryPrompt') ??
    DEFAULT_PAGE_SUMMARY_PROMPT;

  const model = models.find(m => m.id === summaryModelId);

  if (!model) {
    throw new Error(`Summary model with id ${summaryModelId} not found`);
  }

  const llm = model.chatModel;

  // Initialize Langfuse CallbackHandler for tracing if credentials are available
  const langfuseHandler = langfuseEnabled
    ? new CallbackHandler({
        userId: 'summarizer',
        tags: ['backstage-ai-assistant', 'summarizer'],
      })
    : undefined;

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

  const pagePromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
      PURPOSE:
      {pageSummaryPrompt}
      
      Please summarize the following page content in {summaryLength}.
    `),
    HumanMessagePromptTemplate.fromTemplate(`
      Page Title: {pageTitle}
      Page URL: {pageUrl}
      
      Content:
      {pageContent}
      
      Please provide a summary of this page.
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

    const invokeOptions: any = {
      runName: 'conversation-summarizer',
      tags: ['summarizer'],
    };

    if (langfuseEnabled) {
      invokeOptions.callbacks = [langfuseHandler];
    }

    const { text } = await llm.invoke(prompt, invokeOptions);

    return text.trim();
  };

  const summarizePage: SummarizerService['summarizePage'] = async (
    pageContent,
    pageUrl = '',
    pageTitle = '',
    summaryLength = 'as few words as possible',
  ) => {
    logger.info(
      `[Page Summary] Starting summarization for content: ${pageContent.length} characters`,
    );

    // Clean the page content before summarization
    const cleanedContent = cleanPageContent(pageContent);
    logger.info(
      `[Page Summary] Cleaned content: ${cleanedContent.length} characters`,
    );

    const prompt = await pagePromptTemplate.formatMessages({
      pageSummaryPrompt,
      summaryLength,
      pageTitle,
      pageUrl,
      pageContent: cleanedContent,
    });

    const invokeOptions: any = {
      runName: 'page-summarizer',
      tags: ['summarizer', 'page-summary'],
      timeout: 60000, // 60 second timeout at the LLM level
    };

    if (langfuseEnabled) {
      invokeOptions.callbacks = [langfuseHandler];
    }

    logger.info(`[Page Summary] Invoking LLM for summarization...`);
    const startTime = Date.now();

    try {
      const { text } = await llm.invoke(prompt, invokeOptions);
      const endTime = Date.now();
      logger.info(
        `[Page Summary] ✅ Summarization completed in ${endTime - startTime}ms`,
      );

      return text.trim();
    } catch (error) {
      const endTime = Date.now();
      console.error(
        `[Page Summary] ❌ Summarization failed after ${
          endTime - startTime
        }ms:`,
        error,
      );
      throw error;
    }
  };

  return { summarize, summarizePage };
};
