import {
  BackstageCredentials,
  coreServices,
  createServiceFactory,
  createServiceRef,
  ServiceRef,
  AuthService,
} from '@backstage/backend-plugin-api';
import {
  Tool,
  UserTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { McpService, mcpServiceRef } from './mcp';
import { DynamicStructuredTool } from '@langchain/core/tools';

export type ToolsService = {
  registerTools: (tools: Tool[]) => void;
  getTools: () => Tool[];
  getAvailableUserTools: (options: {
    credentials: BackstageCredentials;
  }) => Promise<UserTool[]>;
  getPrincipalTools: (options: {
    credentials: BackstageCredentials;
    filter?: (tool: Tool) => boolean;
  }) => Promise<DynamicStructuredTool[]>;
};

export type CreateToolsServiceOptions = {
  mcp: McpService;
  auth: AuthService;
};

const createToolsService = async ({
  mcp,
  auth,
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

  const getPrincipalTools: ToolsService['getPrincipalTools'] = async ({
    credentials,
    filter = () => true,
  }) => {
    const isUser = auth.isPrincipal(credentials, 'user');

    if (!isUser) {
      return tools.filter(filter).map(t => new DynamicStructuredTool(t));
    }

    const mcpTools = await mcp.getTools(credentials);

    const allTools = tools.concat(mcpTools);
    return allTools.filter(filter).map(t => new DynamicStructuredTool(t));
  };

  return { registerTools, getTools, getAvailableUserTools, getPrincipalTools };
};

export const toolsServiceRef: ServiceRef<ToolsService, 'plugin', 'singleton'> =
  createServiceRef<ToolsService>({
    id: 'ai-assistant.tools-service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          mcp: mcpServiceRef,
          auth: coreServices.auth,
        },
        factory: async options => {
          return createToolsService(options);
        },
      }),
  });
