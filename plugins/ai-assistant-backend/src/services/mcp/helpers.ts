import { DynamicStructuredTool } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { createAssistantTool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

const convertToAssistantTool = (
  mcpTool: DynamicStructuredTool,
  serverName: string,
): Tool => {
  const { name, description, schema } = mcpTool;
  const provider = `mcp server:${serverName}`;

  const tool = {
    name,
    provider,
    description,
    schema: schema as Tool['schema'],
    func: async (params: any) => {
      const result = await mcpTool.invoke(params);
      return {
        content: JSON.stringify(result),
      };
    },
  };

  return createAssistantTool({ tool });
};

export const getToolsForServer = async (
  mcpClient: MultiServerMCPClient,
  serverName: string,
): Promise<Tool[]> => {
  const mcpTools = await mcpClient.getTools(serverName);

  const assistantTools = mcpTools.map(mcpTool =>
    convertToAssistantTool(mcpTool, serverName),
  );
  return assistantTools;
};
