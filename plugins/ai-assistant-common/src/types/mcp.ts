import { ClientConfig } from '@langchain/mcp-adapters';

type LangchainMcpOptions = ClientConfig['mcpServers'];

export type McpServerConfigOptions =
  LangchainMcpOptions[keyof LangchainMcpOptions];

export type McpServerConfig = {
  name: string;
  options: McpServerConfigOptions;
  core?: boolean;
};
