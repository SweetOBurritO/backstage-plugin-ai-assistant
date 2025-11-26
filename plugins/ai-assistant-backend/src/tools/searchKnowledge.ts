import {
  createAssistantTool,
  VectorStore,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import z from 'zod';

type CreateSearchKnowledgeToolOptions = {
  vectorStore: VectorStore;
};

export const createSearchKnowledgeTool = ({
  vectorStore,
}: CreateSearchKnowledgeToolOptions): Tool => {
  const knowledgeTool = createAssistantTool({
    tool: {
      name: 'search-knowledge-base',
      description: `Search the internal knowledge base containing company specific information.

Use this tool when users ask about:
- General questions about the company or internal information

Do NOT use for general knowledge that doesn't require company-specific information.`,
      provider: 'core',
      schema: z.object({
        query: z.string().describe('The query to search for.'),
        filter: z
          .object({
            source: z.string().optional().describe('Source to filter by.'),
            id: z.string().optional().describe('ID to filter by.'),
          })
          .optional()
          .describe('Filters to apply to the search.'),
        amount: z
          .number()
          .min(1)
          .optional()
          .describe('The number of results to return.'),
      }),
      func: async ({ query, filter, amount }) => {
        const results = await vectorStore.similaritySearch(
          query,
          filter,
          amount,
        );

        console.log(results);

        if (results.length === 0) {
          return {
            content: 'No relevant information found in the knowledge base.',
          };
        }

        const content = results.map(r => r.content).join('\n---\n');

        const urls = results.map(r => r.metadata.url);

        return {
          content,
          metadata: {
            urls,
          },
        };
      },
    },
  });

  return knowledgeTool;
};
