# Backstage Plugin: AI Assistant

A production-ready Backstage plugin that provides an intelligent AI assistant with Retrieval-Augmented Generation (RAG) capabilities. This plugin enables conversational AI interactions with context from your organization's documentation, code repositories, and catalog entities.

## ✨ Features

- **Multi-Model Support**: Integrate with multiple LLM providers (Azure OpenAI, Ollama, and more)
- **RAG with Vector Search**: Semantic search using pgvector for context-aware responses
- **Pluggable Architecture**: Extensible system for custom ingestors, embeddings providers, and tools
- **Multiple Data Sources**: Ingest from Backstage Catalog, GitHub, Azure DevOps, and custom sources
- **Real-time Streaming**: Live response streaming using Backstage signals
- **Conversation Management**: Persistent chat history and conversation tracking
- **Tool/Function Calling**: Extend AI capabilities with custom tools and functions

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or 22
- PostgreSQL database with pgvector extension
- Backstage instance (compatible with new backend system)

### Installation

1. **Install the packages:**

```bash
# From your Backstage root directory
yarn add @sweetoburrito/backstage-plugin-ai-assistant
yarn add --cwd packages/backend @sweetoburrito/backstage-plugin-ai-assistant-backend
```

2. **Add the frontend plugin to your Backstage app:**

```typescript
// packages/app/src/App.tsx
import { AiAssistantPage } from '@sweetoburrito/backstage-plugin-ai-assistant';

// Add route
<Route path="/ai-assistant" element={<AiAssistantPage />} />;
```

3. **Add the backend plugin:**

```typescript
// packages/backend/src/index.ts
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add required modules
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
  ),
);
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
  ),
);
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog'
  ),
);
```

4. **Configure in `app-config.yaml`:**

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      deploymentName: 'text-embedding-3-large'
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: https://your-instance.openai.azure.com/
  models:
    azureAi:
      apiKey: ${AZURE_AI_API_KEY}
      models:
        - endpoint: https://your-instance.openai.azure.com/
          modelName: gpt-4
```

5. **Set up the database:**

The plugin will automatically create the required tables with pgvector extension on first run.

For detailed setup instructions, see [Deployment Guide](./docs/deployment.md).

## 📖 Documentation

- **[Architecture Overview](./docs/architecture.md)** - System design, components, and data flow
- **[Configuration Guide](./docs/configuration.md)** - Complete configuration reference
- **[Deployment Guide](./docs/deployment.md)** - Installation and production setup
- **[Custom Ingestor Development](./docs/custom-ingestor.md)** - Build custom data sources
- **[Custom Tool Development](./docs/custom-tools.md)** - Extend AI capabilities with functions
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions

## 🏗️ Architecture

The plugin follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│              ai-assistant Plugin UI                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────────┐
│                  Backend Core Plugin                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Chat Service │  │  Ingestion   │  │Vector Store  │     │
│  │              │  │   Pipeline   │  │  (pgvector)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Extension Points
        ┌─────────────┼─────────────┬──────────────┐
        │             │              │              │
┌───────▼─────┐ ┌────▼────┐  ┌─────▼─────┐  ┌────▼────┐
│ Embeddings  │ │ Models  │  │ Ingestors │  │  Tools  │
│  Providers  │ │Providers│  │           │  │         │
└─────────────┘ └─────────┘  └───────────┘  └─────────┘
```

See the [Architecture Guide](./docs/architecture.md) for detailed information.

## 🔧 Available Modules

### Embeddings Providers

- `ai-assistant-backend-module-embeddings-provider-azure-open-ai` - Azure OpenAI embeddings
- `ai-assistant-backend-module-embeddings-provider-ollama` - Local Ollama embeddings

### Model Providers

- `ai-assistant-backend-module-model-provider-azure-ai` - Azure AI/OpenAI models
- `ai-assistant-backend-module-model-provider-ollama` - Local Ollama models

### Ingestors

- `ai-assistant-backend-module-ingestor-catalog` - Backstage catalog entities
- `ai-assistant-backend-module-ingestor-github` - GitHub repositories
- `ai-assistant-backend-module-ingestor-azure-devops` - Azure DevOps repos

## 🛠️ Development

### Local Development

```bash
# Install dependencies
yarn install

# Start the development environment
yarn start

# Run tests
yarn test

# Lint code
yarn lint:all

# Format code
yarn prettier:write
```

### Project Structure

```
plugins/
├── ai-assistant/                    # Frontend plugin
├── ai-assistant-backend/            # Backend plugin (core)
├── ai-assistant-common/             # Shared types
├── ai-assistant-node/               # Backend interfaces
└── ai-assistant-backend-module-*/   # Backend modules
```

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

Please follow the existing code style and ensure all tests pass.

## 📋 Roadmap

<!-- Add roadmap items here -->

## 📄 License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

## 💬 Support

For issues, questions, or contributions, please:

- Check the [Troubleshooting Guide](./docs/troubleshooting.md)
- Open an issue on GitHub
- Refer to the [documentation](./docs/)

---

**Note**: This plugin is production-ready and actively maintained.
