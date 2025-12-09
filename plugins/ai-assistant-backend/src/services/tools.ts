import {
  BackstageCredentials,
  coreServices,
  createServiceFactory,
  createServiceRef,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import {
  Tool,
  UserTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { McpService, mcpServiceRef } from './mcp';

export type ToolsService = {
  registerTools: (tools: Tool[]) => void;
  getTools: () => Tool[];
  getAvailableUserTools: (options: {
    credentials: BackstageCredentials;
  }) => Promise<UserTool[]>;
  getUserTools: (options: {
    credentials: BackstageCredentials;
  }) => Promise<Tool[]>;
};

export type CreateToolsServiceOptions = {
  mcp: McpService;
};

const createToolsService = async ({
  mcp,
}: CreateToolsServiceOptions): Promise<ToolsService> => {
  const tools: Tool[] = [];

  const registerTools: ToolsService['registerTools'] = async providers => {
    tools.push(...providers);
  };

  const getTools: ToolsService['getTools'] = () => {
    return tools;
  };

  const getAvailableUserTools: ToolsService['getAvailableUserTools'] = async ({
    credentials,
  }) => {
    const mcpTools = await mcp.getTools(credentials);

    const availableTools: UserTool[] = tools.concat(mcpTools).map(tool => ({
      name: tool.name,
      provider: tool.provider,
      description: tool.description,
    }));

    return availableTools;
  };

  const getUserTools: ToolsService['getUserTools'] = async ({
    credentials,
  }) => {
    const mcpTools = await mcp.getTools(credentials);
    return tools.concat(mcpTools);
  };

  return { registerTools, getTools, getAvailableUserTools, getUserTools };
};

export const toolsServiceRef: ServiceRef<ToolsService, 'plugin', 'singleton'> =
  createServiceRef<ToolsService>({
    id: 'ai-assistant.tools-service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          logger: coreServices.logger,
          mcp: mcpServiceRef,
        },
        factory: async options => {
          return createToolsService(options);
        },
      }),
  });
