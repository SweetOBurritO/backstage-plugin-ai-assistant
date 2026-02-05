import {
  BackstageCredentials,
  coreServices,
  createServiceFactory,
  createServiceRef,
  RootConfigService,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import { createAgent as createLangchainAgent } from 'langchain';
import {
  EnabledTool,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { toolFilter } from './helpers/tool-filter';
import {
  DEFAULT_FORMATTING_PROMPT,
  DEFAULT_IDENTITY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TOOL_GUIDELINE,
} from '../../constants/prompts';
import { SystemMessagePromptTemplate } from '@langchain/core/prompts';

import { CallbackService, callbackServiceRef } from '../callbacks';
import { modelServiceRef, ModelService } from '../model';
import { toolsServiceRef, ToolsService } from '../tools';

import { BaseMessage, BaseMessageChunk } from '@langchain/core/messages';
import { parseLangchainMessage } from './helpers/message-parser';
import { createDeterministicUuid } from './helpers/deterministic-uuid';

type PromptOptions = {
  credentials: BackstageCredentials;
  metadata: {
    conversationId: string;
    userId: string;
    runName: string;
    runId: string;
  };
  messages: Message[];
  modelId?: string;
  tools?: EnabledTool[];
  systemPrompt?: string;
  context?: string;
};

type StreamOptions = PromptOptions & {
  onStreamChunk: (messages: Message[]) => void;
  onStreamEnd?: () => void;
};

export type AgentService = {
  prompt: (options: PromptOptions) => Promise<Message[]>;
  stream: (options: StreamOptions) => Promise<void>;
};

type AgentServiceOptions = {
  model: ModelService;
  config: RootConfigService;
  tool: ToolsService;
  callback: CallbackService;
};

const createAgentService = ({
  model,
  tool,
  config,
  callback,
}: AgentServiceOptions): AgentService => {
  const identityPrompt =
    config.getOptionalString('aiAssistant.prompt.identity') ||
    DEFAULT_IDENTITY_PROMPT;

  const formattingPrompt =
    config.getOptionalString('aiAssistant.prompt.formatting') ||
    DEFAULT_FORMATTING_PROMPT;

  const contentPrompt =
    config.getOptionalString('aiAssistant.prompt.content') ||
    DEFAULT_SYSTEM_PROMPT;

  const defaultBasePrompt = `${identityPrompt}\n\n${formattingPrompt}\n\n${contentPrompt}`;

  const toolGuideline =
    config.getOptionalString('aiAssistant.prompt.toolGuideline') ||
    DEFAULT_TOOL_GUIDELINE;

  const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(`
    PURPOSE:
    {systemPrompt}

    TOOL USAGE GUIDELINES:
    {toolGuideline}

    Available tools:
    {toolList}

    Context:
    {context}`);

  const createAgent = async (
    options: PromptOptions,
  ): Promise<ReturnType<typeof createLangchainAgent>> => {
    const {
      modelId,
      credentials,
      tools: enabledTools,
      systemPrompt = defaultBasePrompt,
      context = 'none',
      metadata: { conversationId, userId, runId, runName },
    } = options;

    const { chatModel: llm, id: resolvedModelId } = model.getModel(
      modelId ?? 'default',
    );

    const tools = await tool.getPrincipalTools({
      credentials,
      filter: t => {
        return toolFilter(t, enabledTools);
      },
    });

    const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    const agentPrompt = await systemPromptTemplate.formatMessages({
      toolGuideline,
      toolList,
      context,
      systemPrompt,
    });

    const { callbacks } = await callback.getChainCallbacks({
      userId,
      conversationId,
      modelId: resolvedModelId,
    });

    const { metadata } = await callback.getChainMetadata({
      userId,
      conversationId,
      modelId: resolvedModelId,
    });

    const agent = createLangchainAgent({
      model: llm,
      tools,
      systemPrompt: agentPrompt[0].text,
    }).withConfig({
      callbacks,
      metadata,
      runId,
      runName,
    });

    return agent;
  };

  const stream: AgentService['stream'] = async options => {
    const { messages, onStreamChunk, onStreamEnd } = options;

    const agent = await createAgent(options);

    const promptStream = await agent.stream(
      {
        messages,
      },
      {
        streamMode: ['messages'],
      },
    );

    const promptMessages: BaseMessageChunk[] = [];

    for await (const [, [chunk]] of promptStream) {
      const messageChunk = chunk as BaseMessageChunk;

      messageChunk.id = createDeterministicUuid(messageChunk);

      const existingChunksIndex = promptMessages.findIndex(
        m => m.id === messageChunk.id,
      );

      if (existingChunksIndex === -1) {
        promptMessages.push(messageChunk);
      } else {
        const existingChunk = promptMessages[existingChunksIndex];

        existingChunk.concat(messageChunk);

        promptMessages[existingChunksIndex] =
          existingChunk.concat(messageChunk);
      }

      const parsedMessages: Message[] = promptMessages.map(m =>
        parseLangchainMessage(m, options.metadata.runId),
      );

      onStreamChunk(parsedMessages);
    }

    onStreamEnd?.();
  };

  const prompt: AgentService['prompt'] = async options => {
    const {
      messages,
      metadata: { runId },
    } = options;
    const agent = await createAgent(options);

    const result = await agent.invoke({
      messages,
    });

    return (result.messages as BaseMessage[]).map(m =>
      parseLangchainMessage(m, runId),
    );
  };

  return { prompt, stream };
};

export const agentServiceRef: ServiceRef<AgentService, 'plugin', 'singleton'> =
  createServiceRef<AgentService>({
    id: 'ai-assistant.conversation-service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          config: coreServices.rootConfig,
          model: modelServiceRef,
          tool: toolsServiceRef,
          callback: callbackServiceRef,
        },
        factory: async options => {
          return createAgentService(options);
        },
      }),
  });
