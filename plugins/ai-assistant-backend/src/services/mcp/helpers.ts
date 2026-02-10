import { DynamicStructuredTool } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { createAssistantTool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

/**
 * Sanitizes tool names to match OpenAI's required pattern: ^[a-zA-Z0-9_\.-]+$
 * Replaces invalid characters with underscores and removes consecutive underscores
 */
const sanitizeToolName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9_.-]/g, '_') // Replace invalid chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

const convertToAssistantTool = (
  mcpTool: DynamicStructuredTool,
  serverName: string,
): Tool => {
  const { name, description, schema } = mcpTool;
  const provider = `mcp server:${serverName}`;
  const sanitizedName = sanitizeToolName(name);

  const tool = {
    name: sanitizedName,
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
