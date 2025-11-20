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
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import {
  encrypt,
  decrypt,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { McpStore } from '../../database/mcp-store';
import { getToolsForServer } from './helpers';

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
  deleteUserMcpServerConfig: (
    credentials: BackstageCredentials,
    name: string,
  ) => Promise<void>;
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

  const preConfiguredMcpServers: Record<string, McpServerConfigOptions> =
    serversConfig
      ? serversConfig.reduce((acc, server) => {
          const serverName = server.getString('name');
          const options = server.get<McpServerConfigOptions>('options');

          acc[serverName] = options;

          return acc;
        }, {} as Record<string, McpServerConfigOptions>)
      : {};

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

    const userMcpServers: Record<string, McpServerConfigOptions> =
      userMcpConfig.length
        ? userMcpConfig.reduce((acc, server) => {
            const { name, options } = server;

            acc[name] = options;

            return acc;
          }, {} as Record<string, McpServerConfigOptions>)
        : {};

    const mcpServers: Record<string, McpServerConfigOptions> = {
      ...preConfiguredMcpServers,
      ...userMcpServers,
    };

    const serverNames = Object.keys(mcpServers);

    if (serverNames.length === 0) {
      return [];
    }

    const mcpClient = new MultiServerMCPClient({
      prefixToolNameWithServerName: true,
      useStandardContentBlocks: true,
      mcpServers,
    });

    const serverToolPromises = serverNames.map(serverName =>
      getToolsForServer(mcpClient, serverName),
    );
    const toolsByServer = await Promise.all(serverToolPromises);

    return toolsByServer.flat();
  };

  const validateMcpServerConfig = async (
    mcpConfig: McpServerConfig[],
  ): Promise<void> => {
    try {
      const userMcpServers = mcpConfig.reduce((acc, server) => {
        const { name, options } = server;

        acc[name] = options;

        return acc;
      }, {} as Record<string, McpServerConfigOptions>);

      const userConfigClient = new MultiServerMCPClient({
        prefixToolNameWithServerName: true,
        useStandardContentBlocks: true,
        mcpServers: userMcpServers,
      });

      await userConfigClient.getTools();
    } catch (e) {
      const error = new Error('Invalid MCP server configuration');
      error.name = 'McpConfigurationError';
      throw error;
    }
  };

  const createUserMcpServerConfig: McpService['createUserMcpServerConfig'] =
    async (credentials, mcpConfig) => {
      await validateMcpServerConfig([mcpConfig]);
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      const { name, options } = mcpConfig;

      const encryptedOptions = encrypt(JSON.stringify(options), encryptionKey);

      await mcpStore.createUserMcpConfig(userEntityRef, name, encryptedOptions);
    };

  const updateUserMcpServerConfig: McpService['updateUserMcpServerConfig'] =
    async (credentials, mcpConfig) => {
      await validateMcpServerConfig([mcpConfig]);
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      const { name, options } = mcpConfig;

      const encryptedOptions = encrypt(JSON.stringify(options), encryptionKey);

      await mcpStore.updateUserMcpConfig(userEntityRef, name, encryptedOptions);
    };

  const deleteUserMcpServerConfig: McpService['deleteUserMcpServerConfig'] =
    async (credentials, name) => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);
      await mcpStore.deleteUserMcpConfig(userEntityRef, name);
    };

  return {
    getTools,
    createUserMcpServerConfig,
    updateUserMcpServerConfig,
    getUserMcpServerConfigNames,
    deleteUserMcpServerConfig,
  };
};
