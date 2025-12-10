import {
  BackstageCredentials,
  coreServices,
  createServiceFactory,
  createServiceRef,
  RootConfigService,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
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

import { BaseMessage } from '@langchain/core/messages';
import { parseLangchainMessage } from './helpers/message-parser';

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
  ): Promise<ReturnType<typeof createReactAgent>> => {
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

    const agent = createReactAgent({
      llm,
      tools,
      prompt: agentPrompt[0].text,
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

    agent.config = {
      ...agent.config,
      callbacks,
      metadata,
      runId,
      runName,
    };

    return agent;
  };

  const stream: AgentService['stream'] = async options => {
    const { messages, onStreamChunk } = options;

    const agent = await createAgent(options);

    const promptStream = await agent.stream(
      {
        messages,
      },
      {
        streamMode: ['values'],
      },
    );

    for await (const [, chunk] of promptStream) {
      const { messages: promptMessages } = chunk;

      const parsedMessages: Message[] = (promptMessages as BaseMessage[]).map(
        m => parseLangchainMessage(m, options.metadata.runId),
      );

      onStreamChunk(parsedMessages);
    }
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
