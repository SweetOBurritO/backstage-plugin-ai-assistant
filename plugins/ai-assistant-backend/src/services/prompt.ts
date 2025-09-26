import { RootConfigService } from '@backstage/backend-plugin-api';
import { EmbeddingDocument } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { DEFAULT_SYSTEM_PROMPT } from '../constants/prompts';

type PromptBuilderOptions = {
  config: RootConfigService;
};

export type PromptBuilder = {
  buildPrompt: (
    chatHistory: Message[],
    promptContext: EmbeddingDocument[],
  ) => Message[];
};

export const createPromptBuilder = ({
  config,
}: PromptBuilderOptions): PromptBuilder => {
  const system =
    config.getOptionalString('aiAssistant.prompt.system') ||
    DEFAULT_SYSTEM_PROMPT;

  const getContext = (context: EmbeddingDocument[]) => {
    return `
    Context:
    ${context.map(doc => JSON.stringify(doc)).join('\n')}
    `;
  };

  const buildPrompt: PromptBuilder['buildPrompt'] = (
    chatHistory,
    promptContext,
  ) => {
    const context = getContext(promptContext);

    return [
      {
        role: 'system',
        content: system.concat(context),
      },
      ...chatHistory,
    ];
  };

  return {
    buildPrompt,
  };
};
