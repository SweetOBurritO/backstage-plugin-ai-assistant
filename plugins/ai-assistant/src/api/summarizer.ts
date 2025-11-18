import { createApiRef } from '@backstage/core-plugin-api';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type SummarizerApi = Awaited<ReturnType<typeof createSummarizerService>>;

type SummarizerApiOptions = {
  fetchApi: FetchApi;
  discoveryApi: DiscoveryApi;
};

export const summarizerApiRef = createApiRef<SummarizerApi>({
  id: 'plugin.ai-assistant.summarizer',
});

export const createSummarizerService = ({
  fetchApi,
  discoveryApi,
}: SummarizerApiOptions) => {
  const summarizeContent = async (content: string): Promise<string> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(
      `${assistantBaseUrl}/summary/content`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json();
    return data.summary as string;
  };

  const summarizeConversation = async (
    messages: Message[],
  ): Promise<string> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');
    const response = await fetchApi.fetch(
      `${assistantBaseUrl}/summary/conversation`,
      {
        method: 'POST',
        body: JSON.stringify({ messages }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json();
    return data.summary as string;
  };

  return {
    summarizeContent,
    summarizeConversation,
  };
};
