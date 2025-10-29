import {
  BackstageCredentials,
  DatabaseService,
  RootConfigService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import {
  McpServerConfig,
  McpServerConfigOptions,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import {
  createAssistantTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { McpStore } from '../database/mcp-store';
import {
  encrypt,
  decrypt,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

type CreateMcpServiceOptions = {
  config: RootConfigService;
  userInfo: UserInfoService;
  database: DatabaseService;
};

export type McpService = {
  getTools: (credentials: BackstageCredentials) => Promise<Tool[]>;
  createUserMcpServerConfig: (
    credentials: BackstageCredentials,
    config: McpServerConfig,
  ) => Promise<void>;
  updateUserMcpServerConfig: (
    credentials: BackstageCredentials,
    config: McpServerConfig,
  ) => Promise<void>;
  getUserMcpServerConfigNames: (
    credentials: BackstageCredentials,
  ) => Promise<string[]>;
};

export const createMcpService = async ({
  config,
  userInfo,
  database,
}: CreateMcpServiceOptions): Promise<McpService> => {
  const serversConfig = config.getOptionalConfigArray(
    'aiAssistant.mcp.servers',
  );
  const encryptionKey = config.getString('aiAssistant.mcp.encryptionKey');

  const preConfiguredMcpServers = serversConfig
    ? serversConfig.reduce((acc, server) => {
        const serverName = server.getString('name');
        const options = server.get<McpServerConfigOptions>('options');

        acc[serverName] = options;

        return acc;
      }, {} as Record<string, McpServerConfigOptions>)
    : {};

  const preConfiguredMcpClient = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    useStandardContentBlocks: true,
    mcpServers: preConfiguredMcpServers,
  });

  const mcpStore = await McpStore.fromConfig({ database });

  const getUserMcpServerConfigNames: McpService['getUserMcpServerConfigNames'] =
    async credentials => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      return mcpStore.getUserUserMcpConfigNames(userEntityRef);
    };

  const getUserMcpServerConfig = async (
    credentials: BackstageCredentials,
  ): Promise<McpServerConfig[]> => {
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const encryptedMcpConfig = await mcpStore.getUserMcpConfigs(userEntityRef);

    const mcpConfig: McpServerConfig[] = encryptedMcpConfig.map(c => ({
      name: c.name,
      options: JSON.parse(decrypt(c.encryptedOptions, encryptionKey)),
    }));

    return mcpConfig;
  };

  const getTools: McpService['getTools'] = async credentials => {
    const userMcpConfig = await getUserMcpServerConfig(credentials);

    const userMcpServers = userMcpConfig.reduce((acc, server) => {
      const { name, options } = server;

      acc[name] = options;

      return acc;
    }, {} as Record<string, McpServerConfigOptions>);

    const userConfigClient = new MultiServerMCPClient({
      prefixToolNameWithServerName: true,
      useStandardContentBlocks: true,
      mcpServers: userMcpServers,
    });

    const userMcpTools = await userConfigClient.getTools();
    const preConfiguredMcpTools = await preConfiguredMcpClient.getTools();

    const mcpTools = [...userMcpTools, ...preConfiguredMcpTools];

    const tools = mcpTools.map(mcpTool => {
      const { name, description, schema } = mcpTool;
      return createAssistantTool({
        tool: {
          name,
          description,
          schema: schema as Tool['schema'],
          func: async (params: any) => {
            const result = await mcpTool.invoke(params);
            return JSON.stringify(result);
          },
        },
      });
    });

    return tools;
  };

  const createUserMcpServerConfig: McpService['createUserMcpServerConfig'] =
    async (credentials, mcpConfig) => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      const { name, options } = mcpConfig;

      const encryptedOptions = encrypt(JSON.stringify(options), encryptionKey);

      await mcpStore.createUserMcpConfig(userEntityRef, name, encryptedOptions);
    };

  const updateUserMcpServerConfig: McpService['updateUserMcpServerConfig'] =
    async (credentials, mcpConfig) => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      const { name, options } = mcpConfig;

      const encryptedOptions = encrypt(JSON.stringify(options), encryptionKey);

      await mcpStore.updateUserMcpConfig(userEntityRef, name, encryptedOptions);
    };

  return {
    getTools,
    createUserMcpServerConfig,
    updateUserMcpServerConfig,
    getUserMcpServerConfigNames,
  };
};
