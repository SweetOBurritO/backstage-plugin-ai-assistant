import {
  BackstageCredentials,
  coreServices,
  createServiceFactory,
  createServiceRef,
  ServiceRef,
  AuthService,
  RootConfigService,
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
  config: RootConfigService;
};

type ToolSelector = Pick<EnabledTool, 'name' | 'provider'>;

const createToolsService = async ({
  mcp,
  auth,
  config,
}: CreateToolsServiceOptions): Promise<ToolsService> => {
  const tools: Tool[] = [];
  const coreTools: Tool[] = [];

  const areSameTools = (left: ToolSelector, right: ToolSelector) =>
    left.name === right.name && left.provider === right.provider;

  const getConfiguredTools = (path: string): ToolSelector[] | undefined => {
    const configuredTools = config.getOptionalConfigArray(path);

    if (!configuredTools) {
      return undefined;
    }

    return configuredTools.map(tool => ({
      name: tool.getString('name'),
      provider: tool.getString('provider'),
    }));
  };

  const uniqTools = (allTools: Tool[]): Tool[] => {
    const toolMap = new Map(
      allTools.map(tool => [`${tool.provider}:${tool.name}`, tool]),
    );

    return Array.from(toolMap.values());
  };

  const resolveCoreTools = (allTools: Tool[]): Tool[] => {
    const configuredCoreTools = getConfiguredTools('aiAssistant.tools.core');

    if (configuredCoreTools === undefined) {
      return coreTools;
    }

    return allTools.filter(tool =>
      configuredCoreTools.some(configuredTool =>
        areSameTools(configuredTool, {
          name: tool.name,
          provider: tool.provider,
        }),
      ),
    );
  };

  const resolveDefaultEnabledTools = (
    allTools: Tool[],
    resolvedCore: Tool[],
  ) => {
    const configuredDefaultTools = getConfiguredTools(
      'aiAssistant.tools.defaultEnabled',
    );

    if (configuredDefaultTools === undefined) {
      return resolvedCore;
    }

    const resolvedConfiguredDefaultTools = allTools.filter(tool =>
      configuredDefaultTools.some(configuredTool =>
        areSameTools(configuredTool, {
          name: tool.name,
          provider: tool.provider,
        }),
      ),
    );

    return uniqTools(resolvedConfiguredDefaultTools.concat(resolvedCore));
  };

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

    const availableTools = uniqTools(tools.concat(mcpTools).concat(coreTools));

    const resolvedCoreTools = resolveCoreTools(availableTools);
    const resolvedDefaultEnabledTools = resolveDefaultEnabledTools(
      availableTools,
      resolvedCoreTools,
    );

    const availableUserTools: EnabledTool[] = availableTools.map(tool => ({
      name: tool.name,
      provider: tool.provider,
      description: tool.description,
      isCore: resolvedCoreTools.some(coreTool =>
        areSameTools(coreTool, {
          name: tool.name,
          provider: tool.provider,
        }),
      ),
      enabledByDefault: resolvedDefaultEnabledTools.some(defaultTool =>
        areSameTools(defaultTool, {
          name: tool.name,
          provider: tool.provider,
        }),
      ),
    }));

    return availableUserTools;
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

    const availableTools = uniqTools(tools.concat(mcpTools).concat(coreTools));
    const resolvedCoreTools = resolveCoreTools(availableTools);

    const userSelectableTools = availableTools.filter(
      tool =>
        !resolvedCoreTools.some(coreTool =>
          areSameTools(coreTool, {
            name: tool.name,
            provider: tool.provider,
          }),
        ),
    );

    const allTools: Tool[] = uniqTools(
      userSelectableTools.filter(filter).concat(resolvedCoreTools),
    );

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
          config: coreServices.rootConfig,
        },
        factory: async options => {
          return createToolsService(options);
        },
      }),
  });
