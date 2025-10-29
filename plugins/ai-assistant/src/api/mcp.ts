import { createApiRef } from '@backstage/core-plugin-api';
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { McpServerConfig } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type McpApi = Awaited<ReturnType<typeof createMcpService>>;

type McpApiOptions = {
  fetchApi: FetchApi;
  discoveryApi: DiscoveryApi;
};

export const mcpApiRef = createApiRef<McpApi>({
  id: 'plugin.ai-assistant.mcp',
});

export const createMcpService = ({ fetchApi, discoveryApi }: McpApiOptions) => {
  const getUserDefinedMcpConfigs = async (): Promise<{ names: string[] }> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${assistantBaseUrl}/mcp/config`);
    const data = await response.json();
    return data;
  };

  const createMcpConfig = async (config: McpServerConfig): Promise<void> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    await fetchApi.fetch(`${assistantBaseUrl}/mcp/config`, {
      method: 'POST',
      body: JSON.stringify(config),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const updateMcpConfig = async (config: McpServerConfig): Promise<void> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    await fetchApi.fetch(`${assistantBaseUrl}/mcp/config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const deleteMcpConfig = async (configName: string): Promise<void> => {
    const assistantBaseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    await fetchApi.fetch(`${assistantBaseUrl}/mcp/config`, {
      method: 'DELETE',
      body: JSON.stringify({ name: configName }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  return {
    getUserDefinedMcpConfigs,
    createMcpConfig,
    updateMcpConfig,
    deleteMcpConfig,
  };
};
