import { createAssistantTool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import z from 'zod';
import { SearchResults, PageResult, Page } from '../types/wikipedia';

type CreateSearchWikipediaToolOptions = {};

export const createSearchWikipediaTool =
  ({}: CreateSearchWikipediaToolOptions): Tool => {
    const wikipediaTool = createAssistantTool({
      tool: {
        name: 'search-wikipedia',
        description: `Use this tool to search Wikipedia articles for relevant information.

      Use this tool when users ask about:
      - General knowledge questions that can be answered using Wikipedia articles
      - Historical facts, biographical information, scientific concepts
      - Definitions and explanations of topics
      `,
        schema: z.object({
          query: z
            .string()
            .describe('The search query to look for on Wikipedia'),
          topKResults: z
            .number()
            .optional()
            .default(3)
            .describe('Number of top results to return (default: 3)'),
          maxContentLength: z
            .number()
            .optional()
            .default(4000)
            .describe('Maximum length of content to return (default: 4000)'),
        }),
        func: async ({ query, topKResults = 3, maxContentLength = 4000 }) => {
          try {
            const baseUrl = 'https://en.wikipedia.org/w/api.php';

            const searchResults = await fetchSearchResults(baseUrl, query);
            const summaries: {
              summary: string;
              url?: string;
            }[] = [];

            for (
              let i = 0;
              i < Math.min(topKResults, searchResults.query.search.length);
              i++
            ) {
              const pageTitle = searchResults.query.search[i].title;
              const pageDetails = await fetchPage(baseUrl, pageTitle);

              if (pageDetails && pageDetails.extract) {
                const summary = `Page: ${pageTitle}\nSummary: ${pageDetails.extract}`;
                summaries.push({
                  summary,
                  url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
                    pageTitle,
                  )}`,
                });
              }
            }

            if (summaries.length === 0) {
              return {
                content: 'No relevant Wikipedia articles found for the query.',
              };
            }

            return {
              content: summaries
                .map(s => s.summary)
                .join('\n\n')
                .slice(0, maxContentLength),
              metadata: {
                urls: summaries
                  .map(s => s.url)
                  .filter(url => url !== undefined),
              },
            };
          } catch (error) {
            return {
              content: `Error searching Wikipedia: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            };
          }
        },
      },
    });

    return wikipediaTool;
  };

/**
 * Fetches search results from Wikipedia API
 */
async function fetchSearchResults(
  baseUrl: string,
  query: string,
): Promise<SearchResults> {
  const searchParams = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
  });

  const response = await fetch(`${baseUrl}?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(
      `Wikipedia search failed: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

/**
 * Fetches page content from Wikipedia API
 */
async function fetchPage(
  baseUrl: string,
  pageTitle: string,
): Promise<Page | null> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    explaintext: 'true',
    redirects: '1',
    format: 'json',
    titles: pageTitle,
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(
      `Wikipedia page fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: PageResult = await response.json();
  const { pages } = data.query;
  const pageId = Object.keys(pages)[0];

  return pages[pageId] || null;
}
