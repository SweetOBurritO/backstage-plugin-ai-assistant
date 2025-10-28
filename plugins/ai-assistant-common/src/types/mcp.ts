import { ClientConfig } from '@langchain/mcp-adapters';

type LangchainMcpOptions = ClientConfig['mcpServers'];

type Options = LangchainMcpOptions[keyof LangchainMcpOptions];

export type McpServerConfig = {
  name: string;
  options: Options;
};
