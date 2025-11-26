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
import { getToolsForServer } from './helpers';
import { UserSettingsStore } from '../../database/user-settings-store';

type CreateMcpServiceOptions = {
  config: RootConfigService;
  userInfo: UserInfoService;
  database: DatabaseService;
};

const MCP_SETTINGS_TYPE = 'mcp_server_config';

export type McpService = {
  getTools: (credentials: BackstageCredentials) => Promise<Tool[]>;
  getUserMcpServerConfigNames: (
    credentials: BackstageCredentials,
  ) => Promise<string[]>;
  deleteUserMcpServerConfig: (
    credentials: BackstageCredentials,
    name: string,
  ) => Promise<void>;
  setUserMcpServerConfig: (
    credentials: BackstageCredentials,
    config: McpServerConfig,
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

  // const mcpStore = await McpStore.fromConfig({ database });
  const userSettingsStore = await UserSettingsStore.fromConfig({ database });

  const getUserMcpServerConfigNames: McpService['getUserMcpServerConfigNames'] =
    async credentials => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);

      const mcpConfig = await userSettingsStore.getUserSettingsByType(
        userEntityRef,
        MCP_SETTINGS_TYPE,
      );
      if (!mcpConfig) {
        return [];
      }

      const names = Object.keys(mcpConfig);

      return names;
    };

  const getUserMcpServerConfig = async (
    credentials: BackstageCredentials,
  ): Promise<McpServerConfig[]> => {
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const mcpConfigEncrypted = await userSettingsStore.getUserSettingsByType<
      Record<string, string>
    >(userEntityRef, MCP_SETTINGS_TYPE);

    if (!mcpConfigEncrypted) {
      return [];
    }

    const mcpConfig: McpServerConfig[] = Object.entries(mcpConfigEncrypted).map(
      ([name, data]) => ({
        name,
        options: JSON.parse(decrypt(data, encryptionKey)),
      }),
    );

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

  const setUserMcpServerConfig: McpService['setUserMcpServerConfig'] = async (
    credentials,
    mcpConfig,
  ) => {
    const { userEntityRef } = await userInfo.getUserInfo(credentials);
    const { name } = mcpConfig;

    const existingConfig = await getUserMcpServerConfig(credentials);

    const existingServerIndex = existingConfig.findIndex(
      server => server.name === name,
    );

    if (existingServerIndex === -1) {
      existingConfig.push(mcpConfig);
    } else {
      existingConfig[existingServerIndex] = mcpConfig;
    }

    await validateMcpServerConfig(existingConfig);

    const updatedConfig: Record<string, string> = existingConfig.reduce(
      (acc, server) => {
        acc[server.name] = encrypt(
          JSON.stringify(server.options),
          encryptionKey,
        );
        return acc;
      },
      {} as Record<string, string>,
    );

    await userSettingsStore.setUserSettings(
      userEntityRef,
      MCP_SETTINGS_TYPE,
      updatedConfig,
    );
  };

  const deleteUserMcpServerConfig: McpService['deleteUserMcpServerConfig'] =
    async (credentials, name) => {
      const { userEntityRef } = await userInfo.getUserInfo(credentials);

      const existingConfig = await getUserMcpServerConfig(credentials);

      const updatedConfig: Record<string, string> = existingConfig
        .filter(server => server.name !== name)
        .reduce((acc, server) => {
          acc[server.name] = encrypt(
            JSON.stringify(server.options),
            encryptionKey,
          );
          return acc;
        }, {} as Record<string, string>);

      await userSettingsStore.setUserSettings(
        userEntityRef,
        MCP_SETTINGS_TYPE,
        updatedConfig,
      );
    };

  return {
    getTools,
    getUserMcpServerConfigNames,
    deleteUserMcpServerConfig,
    setUserMcpServerConfig,
  };
};
