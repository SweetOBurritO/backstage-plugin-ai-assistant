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
  EnabledTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { McpService, mcpServiceRef } from './mcp';
import { DynamicStructuredTool } from '@langchain/core/tools';

export type ToolsService = {
  registerTools: (tools: Tool[]) => void;
  registerCoreTools: (tools: Tool[]) => void;
  getAvailableUserTools: (options: {
    credentials: BackstageCredentials;
  }) => Promise<EnabledTool[]>;
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
  const coreTools: Tool[] = [];

  const registerTools: ToolsService['registerTools'] = async providers => {
    tools.push(...providers);
  };

  const registerCoreTools: ToolsService['registerCoreTools'] =
    async providers => {
      coreTools.push(...providers.map(tool => ({ ...tool, provider: 'core' })));
    };

  const getAvailableUserTools: ToolsService['getAvailableUserTools'] = async ({
    credentials,
  }) => {
    const mcpTools = await mcp.getTools(credentials);

    const availableTools: EnabledTool[] = tools
      .concat(mcpTools)
      .concat(coreTools)
      .map(tool => ({
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

    const userTools = tools.concat(mcpTools);

    const allTools: Tool[] = userTools
      .filter(filter)
      .concat(coreTools.filter(filter));
    return allTools.map(t => new DynamicStructuredTool(t));
  };

  return {
    registerTools,
    registerCoreTools,
    getAvailableUserTools,
    getPrincipalTools,
  };
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
