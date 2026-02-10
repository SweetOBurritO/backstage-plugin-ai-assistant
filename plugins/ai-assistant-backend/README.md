# ai-assistant

This plugin backend was templated using the Backstage CLI. You should replace this text with a description of your plugin backend.

## Installation

This plugin is installed via the `@internal/plugin-ai-assistant-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/plugin-ai-assistant-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/plugin-ai-assistant-backend'));
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.

## Configuration

### MCP Servers

You can configure MCP (Model Context Protocol) servers in your `app-config.yaml` to extend the AI assistant with additional tools and capabilities:

```yaml
aiAssistant:
  mcp:
    encryptionKey: <your-encryption-key>
    servers:
      - name: 'my-mcp-server'
        options:
          command: 'npx'
          args:
            ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files']
        core: false # Set to true to make all tools from this server 'core tools'
```

#### Core Tools

Setting `core: true` on an MCP server marks all tools from that server as "core tools". Core tools are:

- Always available to all users
- Not optional - users cannot disable them
- Typically used for essential system functionality

This is useful when you want to ensure certain MCP-provided tools are always available in the AI assistant, similar to built-in core tools.
