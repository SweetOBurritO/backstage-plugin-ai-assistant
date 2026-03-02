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

## Tool Configuration

You can control tool behavior for all users through backend config:

- `aiAssistant.tools.core`: tools that are always enabled and not user-toggleable.
- `aiAssistant.tools.defaultEnabled`: tools enabled by default for users who do not yet have saved `user-tools` settings.

Both settings accept entries with `provider` and `name`:

```yaml
aiAssistant:
  tools:
    core:
      - provider: core
        name: searchKnowledge
    defaultEnabled:
      - provider: core
        name: searchKnowledge
      - provider: mcp server:foo
        name: foo_someTool
```

For MCP tools, use provider format `mcp server:<server-name>`.
