import { RootConfigService } from '@backstage/backend-plugin-api';
import {
  ChatMessage,
  EmbeddingDocument,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

type PromptBuilderOptions = {
  config: RootConfigService;
};

export type PromptBuilder = {
  buildPrompt: (
    chatHistory: ChatMessage[],
    promptContext: EmbeddingDocument[],
  ) => ChatMessage[];
};

const DEFAULT_SYSTEM_PROMPT = `
You are a helpful assistant that answers questions based on provided context from various documents. The context may come from sources such as internal wikis, code repositories, technical documentation, or other structured or unstructured data.

Rules:
1. Always base your answers on the provided context. Do not make up information.
2. When relevant, cite or reference the source information provided in the context.
3. Format answers clearly and concisely. Use bullet points for lists when appropriate.
4. Maintain a professional, friendly, and helpful tone.
5. Return only the relevant information without any filler or unnecessary details.
6. If you don't know the answer, admit it and suggest ways to find the information.
7. Always return a well-structured response using markdown.
`;

export const createPromptBuilder = ({
  config,
}: PromptBuilderOptions): PromptBuilder => {
  const system = config.getOptionalString('system') || DEFAULT_SYSTEM_PROMPT;

  const getContext = (context: EmbeddingDocument[]) => {
    return `
    Context:
    ${context.map(doc => JSON.stringify(doc)).join('\n')}
    `;
  };

  return {
    buildPrompt: (
      chatHistory: ChatMessage[],
      promptContext: EmbeddingDocument[],
    ): ChatMessage[] => {
      const context = getContext(promptContext);

      return [
        {
          role: 'system',
          content: system.concat(context),
        },
        ...chatHistory,
      ];
    },
  };
};
