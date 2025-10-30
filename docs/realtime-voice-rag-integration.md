# Realtime Voice with RAG Context Integration

## Overview

The realtime voice feature has been enhanced to integrate with the AI Assistant's RAG (Retrieval-Augmented Generation) context and tools. This means your voice conversations can now access the same knowledge base and tools as the text-based AI assistant.

## Architecture

The integration works through an extension point system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Assistant Backend Plugin                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Ingestors  │    │    Tools     │    │ Vector Store │      │
│  │  (GitHub,    │    │ (Search KB,  │    │   (RAG)      │      │
│  │   Catalog)   │    │  Backstage)  │    │              │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                              │                                   │
│                              │ Tools passed via                  │
│                              │ Extension Point                   │
│                              ↓                                   │
│                    ┌─────────────────────┐                      │
│                    │ Realtime Voice Ext. │                      │
│                    │   Point             │                      │
│                    └─────────┬───────────┘                      │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ Tools + RAG access
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│          Realtime Voice Azure Backend Module                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  AzureRealtimeService                                │       │
│  │  - Receives tools from main plugin                   │       │
│  │  - Converts Zod schemas to JSON Schema               │       │
│  │  - Includes tools in session creation                │       │
│  │  - Tools can access vector store for RAG             │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   │ Tools available in
                                   │ realtime session
                                   ↓
                         ┌──────────────────┐
                         │  Azure OpenAI    │
                         │  Realtime API    │
                         │  (with tools)    │
                         └──────────────────┘
```

## How It Works

### 1. Tool Registration

Tools are registered in the main AI Assistant backend plugin through extension points:

```typescript
// Example: Search Knowledge Base Tool
const searchKnowledgeTool = createSearchKnowledgeTool({ vectorStore });
tools.push(searchKnowledgeTool);
```

### 2. Tool Propagation

When the realtime voice module initializes, it registers with the `realtimeVoiceExtensionPoint`. The main plugin then calls `initialize()` on all registered realtime voice services, passing the tools:

```typescript
// In plugin.ts
for (const realtimeVoiceService of realtimeVoiceServices) {
  realtimeVoiceService.initialize({ tools });
}
```

### 3. Tool Conversion

The `AzureRealtimeService` converts internal Tool format (Zod schemas) to Azure OpenAI's expected JSON Schema format:

```typescript
private convertToolsForRealtimeAPI(tools: Tool<ZodType>[]) {
  return tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.schema),
  }));
}
```

### 4. Session Creation with Tools

When a realtime voice session is created, the tools are included in the request:

```typescript
const realtimeTools = this.tools.length > 0 
  ? this.convertToolsForRealtimeAPI(this.tools) 
  : undefined;

const sessionRequest = {
  model: this.config.deploymentName,
  voice: 'alloy',
  instructions: 'You are a helpful AI assistant...',
  tools: realtimeTools, // Tools included here
  // ... other config
};
```

## Available Tools

The realtime voice assistant has access to all tools registered in the AI Assistant backend, including:

### Default Tools

1. **search-knowledge-base**
   - Searches the internal knowledge base (RAG)
   - Accesses documents ingested from GitHub, Azure DevOps, Backstage Catalog, etc.
   - Provides context-aware responses

### Optional Tool Provider Modules

2. **backstage-catalog-tools** (from `ai-assistant-backend-module-tool-provider-backstage`)
   - Query catalog entities
   - Search components, APIs, systems, etc.

3. **search-tools** (from `ai-assistant-backend-module-tool-provider-search`)
   - Wikipedia search
   - General web search capabilities

## Configuration

### Backend Setup

1. **Install Required Modules**:

```bash
cd packages/backend
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai
```

2. **Register Modules** in `packages/backend/src/index.ts`:

```typescript
// Main AI Assistant plugin
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Realtime Voice module
backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure')
);

// Data ingestors (for RAG)
backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github')
);

// Embeddings provider (for RAG)
backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai')
);
```

3. **Configure in `app-config.yaml`**:

```yaml
aiAssistant:
  # Model provider
  models:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: https://your-resource.openai.azure.com
      deploymentName: gpt-4o

  # Embeddings for RAG
  embeddings:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: https://your-resource.openai.azure.com
      deploymentName: text-embedding-3-small

  # Data ingestors for RAG
  ingestors:
    github:
      organizations:
        - name: your-org
          token: ${GITHUB_TOKEN}

  # Realtime Voice
  realtimeVoice:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_REALTIME_API_KEY}
      endpoint: https://your-resource.openai.azure.com
      deploymentName: gpt-4o-realtime-preview
```

## Usage Examples

### Basic Voice Chat with RAG

When a user speaks to the voice assistant:

**User**: "What's our deployment process?"

**Assistant** (uses `search-knowledge-base` tool):
- Searches the vector store for relevant documents
- Finds deployment documentation from ingested GitHub repos
- Responds with accurate, context-aware information

### Voice Chat with Catalog Integration

**User**: "Tell me about the payment service"

**Assistant** (uses `backstage-catalog-tools`):
- Queries the Backstage catalog
- Finds the payment service component
- Provides details about owners, dependencies, and documentation

## Customization

### Custom Instructions

You can customize the voice assistant's behavior by passing custom instructions when creating a session:

```typescript
POST /api/ai-assistant/realtime/session
{
  "voice": "alloy",
  "instructions": "You are a DevOps expert assistant. When answering questions about deployment, always check the knowledge base first and provide step-by-step guidance.",
  "temperature": 0.7
}
```

### Adding Custom Tools

Create custom tools in your backend:

```typescript
import { createAssistantTool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { z } from 'zod';

const customTool = createAssistantTool({
  tool: {
    name: 'check-service-status',
    description: 'Check the health status of a service',
    schema: z.object({
      serviceName: z.string().describe('The name of the service'),
    }),
    func: async ({ serviceName }) => {
      // Your implementation
      return `Status of ${serviceName}: healthy`;
    },
  },
});

// Register via a module
export const customToolModule = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'custom-tool',
  register(reg) {
    reg.registerInit({
      deps: {
        tools: toolExtensionPoint,
      },
      async init({ tools }) {
        tools.register(customTool);
      },
    });
  },
});
```

## Benefits

### 1. **Consistent Context**
Both text and voice assistants access the same knowledge base, ensuring consistent responses across interfaces.

### 2. **Real-time Information**
Voice conversations can query live data from your Backstage catalog, GitHub repos, and other sources.

### 3. **Tool Reusability**
Tools developed for the text assistant automatically become available in voice conversations.

### 4. **Scalable Architecture**
The extension point system makes it easy to add new tools and data sources.

## Limitations

### Current Limitations

1. **Tool Execution on Server**: While tool definitions are sent to Azure OpenAI Realtime API, the actual tool execution happens server-side. The frontend needs to handle tool calls appropriately.

2. **WebRTC Session Length**: Sessions expire after ~1 minute and need to be renewed.

3. **Audio Format**: Currently supports PCM16 audio format.

## Troubleshooting

### Tools Not Available in Voice Session

Check backend logs for:
```
Realtime voice service initialized with X tools
```

If tools count is 0, ensure:
- Embeddings provider is configured
- Vector store is initialized
- Tools are registered before realtime voice module

### Tool Call Failures

Enable debug logging:
```yaml
backend:
  logger:
    level: debug
```

Check for:
- Zod schema conversion errors
- JSON Schema validation issues
- Tool execution errors

## Next Steps

1. **Implement Tool Call Handling**: Update the frontend `RealtimeVoiceChat` component to handle tool calls from the WebRTC session.

2. **Add Tool Call UI**: Display when the assistant is using tools (e.g., "Searching knowledge base...").

3. **Enhance Instructions**: Fine-tune the system instructions to better guide tool usage in voice conversations.

4. **Add More Tools**: Create domain-specific tools for your organization's needs.

## References

- [Azure OpenAI Realtime API Documentation](https://learn.microsoft.com/azure/ai-services/openai/realtime-audio-quickstart)
- [Main Plugin Documentation](./index.md)
- [Realtime Voice Quick Start](./realtime-voice-quickstart.md)
- [Creating Custom Tools](../plugins/ai-assistant-node/README.md)

