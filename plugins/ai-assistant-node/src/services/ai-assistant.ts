import {
  createServiceFactory,
  createServiceRef,
  coreServices,
} from '@backstage/backend-plugin-api';

import type {
  ServiceRef,
  BackstageCredentials,
  AuthService,
  DiscoveryService,
} from '@backstage/backend-plugin-api';
import {
  EnabledTool,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type AiAssistantService = {
  summarize: (options: {
    content: string;
    credentials: BackstageCredentials;
    length?: string;
    prompt?: string;
  }) => Promise<string>;

  prompt: (options: {
    messages: Message[];
    tools?: EnabledTool[];
    modelId?: string;
    systemPrompt?: string;
    context?: string;
    metadata: {
      runName: string;
      userId: string;
    };
    credentials: BackstageCredentials;
  }) => Promise<{
    messages: Message[];
  }>;
};

export type AiAssistantServiceOptions = {
  auth: AuthService;
  discovery: DiscoveryService;
};

const createAiAssistantService = ({
  auth,
  discovery,
}: AiAssistantServiceOptions): AiAssistantService => {
  const summarize: AiAssistantService['summarize'] = async ({
    content,
    credentials,
    length = 'a few sentences',
    prompt,
  }) => {
    const baseUrl = await discovery.getBaseUrl('ai-assistant');

    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'ai-assistant',
    });

    const response = await fetch(`${baseUrl}/summary/content`, {
      method: 'POST',
      body: JSON.stringify({ content, length, prompt }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.summary as string;
  };

  const prompt: AiAssistantService['prompt'] = async options => {
    const { credentials, ...rest } = options;

    const baseUrl = await discovery.getBaseUrl('ai-assistant');

    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'ai-assistant',
    });

    const response = await fetch(`${baseUrl}/agent/prompt`, {
      method: 'POST',
      body: JSON.stringify({ ...rest }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await response.json();

    const messages = body.messages as Message[];

    return {
      messages,
    };
  };

  return {
    summarize,
    prompt,
  };
};

export const aiAssistantServiceRef: ServiceRef<
  AiAssistantService,
  'plugin',
  'singleton'
> = createServiceRef<AiAssistantService>({
  id: 'ai-assistant.ai-assistant-service',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        config: coreServices.rootConfig,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
      },
      factory: async options => {
        return createAiAssistantService(options);
      },
    }),
});
