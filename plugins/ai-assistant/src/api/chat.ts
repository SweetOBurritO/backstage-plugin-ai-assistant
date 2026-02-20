import { createApiRef } from '@backstage/core-plugin-api';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  Conversation,
  EnabledTool,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

type SendMessageOptions = {
  conversationId?: string;
  modelId: string;
  messages: Message[];
  stream?: boolean;
  tools?: EnabledTool[];
};

export type ChatApi = {
  getModels: () => Promise<string[]>;
  getConversation: (id?: string) => Promise<Message[]>;
  sendMessage: (options: SendMessageOptions) => Promise<{
    messages: Message[];
    conversationId: string;
  }>;
  getConversations: () => Promise<Conversation[]>;
  scoreMessage: (messageId: string, score: number) => Promise<void>;
  createShareLink: (conversationId: string) => Promise<string>;
  importSharedConversation: (shareId: string) => Promise<string>;
};

type ChatApiOptions = {
  fetchApi: FetchApi;
  discoveryApi: DiscoveryApi;
};

export const chatApiRef = createApiRef<ChatApi>({
  id: 'plugin.ai-assistant.chat',
});

export const createChatService = ({
  fetchApi,
  discoveryApi,
}: ChatApiOptions): ChatApi => {
  const getModels: ChatApi['getModels'] = async (): Promise<string[]> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${assistantBaseUrl}/models`);
    const data = await response.json();
    return data.models;
  };

  const getConversation: ChatApi['getConversation'] = async id => {
    if (!id) return [];
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${assistantBaseUrl}/chat/${id}`);

    const data = await response.json();

    return data.conversation as Message[];
  };

  const sendMessage: ChatApi['sendMessage'] = async ({
    conversationId,
    modelId,
    messages,
    stream,
    tools,
  }) => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');
    const response = await fetchApi.fetch(`${assistantBaseUrl}/chat/message`, {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        modelId,
        messages,
        stream,
        tools,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return {
      messages: data.messages as Message[],
      conversationId: data.conversationId as string,
    };
  };

  const getConversations: ChatApi['getConversations'] = async () => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(
      `${assistantBaseUrl}/chat/conversations`,
    );

    const data = await response.json();

    return data.conversations as Conversation[];
  };

  const scoreMessage: ChatApi['scoreMessage'] = async (messageId, score) => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    await fetchApi.fetch(
      `${assistantBaseUrl}/chat/message/${messageId}/score`,
      {
        method: 'POST',
        body: JSON.stringify({ score }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  };

  const createShareLink: ChatApi['createShareLink'] = async conversationId => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(
      `${assistantBaseUrl}/chat/share/${conversationId}`,
      {
        method: 'POST',
      },
    );

    const data = await response.json();
    return data.shareId as string;
  };

  const importSharedConversation: ChatApi['importSharedConversation'] =
    async shareId => {
      const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

      const response = await fetchApi.fetch(
        `${assistantBaseUrl}/chat/share/${shareId}/import`,
        {
          method: 'POST',
        },
      );

      const data = await response.json();
      return data.conversationId as string;
    };

  return {
    getModels,
    getConversation,
    sendMessage,
    getConversations,
    scoreMessage,
    createShareLink,
    importSharedConversation,
  };
};
