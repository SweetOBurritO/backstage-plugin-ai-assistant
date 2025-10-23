# Configuration Guide

This guide provides a comprehensive reference for configuring the AI Assistant plugin.

## Table of Contents

- [Core Configuration](#core-configuration)
- [Embeddings Providers](#embeddings-providers)
- [Model Providers](#model-providers)
- [Ingestors](#ingestors)
- [Advanced Configuration](#advanced-configuration)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)

## Core Configuration

All AI Assistant configuration is defined under the `aiAssistant` key in your `app-config.yaml`.

### Basic Structure

```yaml
aiAssistant:
  prompt:
    identity: string # System prompt identity
  storage:
    pgVector:
      chunkSize: number # Chunk size for text splitting
      amount: number # Number of documents to retrieve for RAG
  ingestion:
    schedule:
      frequency:
        days: number # Ingestion frequency
      timeout:
        hours: number # Ingestion timeout
  embeddings:
    # Provider configuration (see below)
  models:
    # Model configuration (see below)

ingestors:
  # Ingestor configuration (see below)
```

### Prompt Configuration

Configure the system prompt that defines the AI assistant's behavior and identity.

```yaml
aiAssistant:
  prompt:
    identity: |
      You are a helpful assistant called Freddy that answers questions 
      based on provided context from various documents. The context may 
      come from sources such as internal wikis, code repositories, 
      technical documentation, or other structured or unstructured data.
```

**Options:**

- `identity` (string, optional) - The system prompt that defines the AI's role and behavior
  - Default: Basic helpful assistant prompt
  - Use multi-line YAML string for longer prompts

**Best Practices:**

- Keep the identity concise but clear
- Specify the AI's name and role
- Include guidelines on how to use provided context
- Mention available tools if applicable

### Conversation Configuration

Configure conversation-related settings like title generation.

```yaml
aiAssistant:
  conversation:
    summaryModel: gpt-4-turbo # Model to use for generating conversation titles
```

**Options:**

- `summaryModel` (string, optional) - Model ID for title generation
  - Must match a model ID from your configured models
  - Recommended: Fast, cost-effective model (e.g., gpt-3.5-turbo, gpt-4-turbo)
  - If not specified, uses first available model

### Storage Configuration

Configure vector storage and RAG behavior.

```yaml
aiAssistant:
  storage:
    pgVector:
      chunkSize: 800 # Characters per chunk
      amount: 10 # Number of similar documents to retrieve
```

**Options:**

- `chunkSize` (number, optional)

  - Size of text chunks for embedding
  - Default: 500
  - Range: 200-2000 recommended
  - Larger chunks = more context per embedding, fewer embeddings
  - Smaller chunks = more granular search, more embeddings

- `amount` (number, optional)
  - Number of similar documents to retrieve for RAG context
  - Default: 10
  - Range: 3-20 recommended
  - More documents = better context, higher token usage
  - Fewer documents = faster, cheaper, more focused

**Performance Impact:**

- `chunkSize`: Affects ingestion time and storage size
- `amount`: Affects response time and token consumption

### Ingestion Schedule

Configure how frequently data is ingested from sources.

```yaml
aiAssistant:
  ingestion:
    schedule:
      frequency:
        days: 1 # Run every day
        # OR hours: 6     # Run every 6 hours
        # OR minutes: 30  # Run every 30 minutes
      timeout:
        hours: 1 # Maximum runtime
        # OR minutes: 30  # 30 minute timeout
```

**Options:**

- `frequency` (object, required)

  - Specify ONE of: `days`, `hours`, or `minutes`
  - Examples:
    - `days: 1` - Daily ingestion
    - `hours: 6` - Every 6 hours
    - `minutes: 30` - Every 30 minutes

- `timeout` (object, required)
  - Maximum time before ingestion is cancelled
  - Specify ONE of: `hours` or `minutes`
  - Should be less than frequency to avoid overlaps

**Recommendations:**

- **Small datasets**: `hours: 1-6`, `timeout: { minutes: 30 }`
- **Medium datasets**: `days: 1`, `timeout: { hours: 1 }`
- **Large datasets**: `days: 1-7`, `timeout: { hours: 3 }`

## Embeddings Providers

Only ONE embeddings provider can be active at a time.

### Azure OpenAI

Use Azure OpenAI for embeddings generation.

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      deploymentName: text-embedding-3-large
      instanceName: eastus
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
      openAIApiVersion: 2024-12-01-preview
```

**Required Options:**

- `deploymentName` (string) - Azure OpenAI deployment name

  - Common models: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
  - Recommendation: `text-embedding-3-large` for best quality

- `instanceName` (string) - Azure region/instance name

  - Examples: `eastus`, `westeurope`, `australiaeast`

- `apiKey` (string) - Azure OpenAI API key

  - Use environment variable substitution: `${AZURE_OPENAI_API_KEY}`
  - Or file reference: `$file: /path/to/key`

- `endpoint` (string) - Azure OpenAI endpoint URL

  - Format: `https://{region}.api.cognitive.microsoft.com/openai/v1/`
  - Must match your Azure deployment

- `openAIApiVersion` (string) - API version
  - Format: `YYYY-MM-DD-preview` or `YYYY-MM-DD`
  - Latest: `2024-12-01-preview`
  - Check Azure docs for supported versions

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
  ),
);
```

### Ollama

Use local Ollama for embeddings generation.

```yaml
aiAssistant:
  embeddings:
    ollama:
      model: nomic-embed-text
      baseUrl: http://localhost:11434
      apiKey: ollama # Optional
```

**Required Options:**

- `model` (string) - Ollama model name

  - Popular models: `nomic-embed-text`, `mxbai-embed-large`, `all-minilm`
  - Must be pulled via `ollama pull <model>`

- `baseUrl` (string) - Ollama API endpoint
  - Default: `http://localhost:11434`
  - Change if running on different host/port

**Optional:**

- `apiKey` (string) - API key if Ollama is secured
  - Default: `ollama`

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama'
  ),
);
```

## Model Providers

Multiple models can be registered and users can select which to use.

### Azure AI

Configure Azure OpenAI or Azure AI Foundry models.

```yaml
aiAssistant:
  models:
    azureAi:
      apiKey: ${AZURE_AI_API_KEY}
      models:
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: gpt-4o
          sdk: openai # Optional: 'openai' or 'azureai', default: 'openai'

        - endpoint: https://my-foundry.azure.com/
          modelName: Phi-4
          sdk: azureai

        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: gpt-4o-mini
```

**Required Options:**

- `apiKey` (string) - API key for authentication

  - Use environment variable: `${AZURE_AI_API_KEY}`
  - Shared across all models in this provider

- `models` (array) - List of model configurations
  - `endpoint` (string, required) - Model endpoint URL
  - `modelName` (string, required) - Model identifier/deployment name
  - `sdk` (string, optional) - SDK to use: `openai` or `azureai`
    - `openai` - For Azure OpenAI deployments (default)
    - `azureai` - For Azure AI Foundry models

**Supported Models:**

- **OpenAI Models**: GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5-turbo
- **Azure AI Foundry**: Phi-4, DeepSeek, Llama, Mistral, and more
- **Third-party**: Grok, Claude (via Azure)

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
  ),
);
```

### Ollama

Use local Ollama models for chat.

```yaml
aiAssistant:
  models:
    ollama:
      baseUrl: http://localhost:11434
      apiKey: ollama # Optional
      models:
        - llama3.2
        - mistral
        - codellama
```

**Required Options:**

- `baseUrl` (string) - Ollama API endpoint

  - Default: `http://localhost:11434`

- `models` (array) - List of model names
  - Must be pulled via `ollama pull <model>`
  - Common models: `llama3.2`, `mistral`, `codellama`, `phi3`

**Optional:**

- `apiKey` (string) - API key if secured
  - Default: `ollama`

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama'
  ),
);
```

## Ingestors

Configure data sources for RAG context.

### Catalog Ingestor

Ingest Backstage catalog entities.

**Configuration:**
No additional configuration needed. The ingestor automatically discovers and ingests catalog entities.

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog'
  ),
);
```

**What's Ingested:**

- Entity metadata (name, description, annotations)
- Entity relationships
- Documentation (if present)
- Custom metadata fields

**Metadata Added:**

```typescript
{
  source: 'catalog',
  id: 'component:default/my-service',
  entityRef: 'component:default/my-service',
  kind: 'Component',
  namespace: 'default',
  name: 'my-service'
}
```

### GitHub Ingestor

Ingest files from GitHub repositories.

```yaml
ingestors:
  github:
    owner: my-org
    appId: 123456
    privateKey: ${GITHUB_PRIVATE_KEY}
    installationId: 12345678

    # Optional configuration
    baseUrl: https://github.company.com # For GitHub Enterprise
    filesBatchSize: 50 # Files per batch
    fileTypes: # Global file type filter
      - .md
      - .mdx
      - .txt
    repositories: # Repository-specific config
      - name: my-repo
        fileTypes: # Override for this repo
          - .md
          - .json
      - name: another-repo
```

**Required Options:**

- `owner` (string) - GitHub organization or username
- `appId` (number) - GitHub App ID
- `privateKey` (string) - GitHub App private key (PEM format)
  - Use environment variable: `${GITHUB_PRIVATE_KEY}`
  - Or file reference: `$file: /path/to/key.pem`
- `installationId` (number) - GitHub App installation ID

**Optional Configuration:**

- `baseUrl` (string) - GitHub Enterprise URL

  - Only needed for GitHub Enterprise
  - Omit for github.com

- `filesBatchSize` (number) - Files processed per batch

  - Default: 50
  - Increase for faster ingestion, decrease for memory constraints

- `fileTypes` (array) - File extensions to ingest

  - Default: All files
  - Examples: `.md`, `.mdx`, `.txt`, `.json`, `.yaml`
  - Include the leading dot

- `repositories` (array) - Repository-specific configuration
  - `name` (string, required) - Repository name
  - `fileTypes` (array, optional) - Override global fileTypes for this repo

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github'
  ),
);
```

**GitHub App Setup:**

1. Create GitHub App in your organization settings
2. Grant permissions: `Contents: Read`
3. Generate private key
4. Install app on repositories
5. Note App ID and Installation ID

**What's Ingested:**

- File contents from specified repositories
- File paths and names
- Repository metadata
- Last modified timestamps

**Metadata Added:**

```typescript
{
  source: 'github',
  id: 'owner/repo/path/to/file.md',
  repository: 'my-repo',
  owner: 'my-org',
  path: 'docs/guide.md',
  url: 'https://github.com/my-org/my-repo/blob/main/docs/guide.md'
}
```

### Azure DevOps Ingestor

Ingest files from Azure DevOps repositories and wikis.

```yaml
ingestors:
  azureDevOps:
    organization: my-org
    project: my-project
    token: ${AZURE_DEVOPS_TOKEN}
    resourceTypes:
      - repository
      - wiki

    # Optional configuration
    fileTypes:
      - .md
      - .txt
    repositories:
      - name: my-repo
        fileTypes:
          - .json
          - .yaml
```

**Required Options:**

- `organization` (string) - Azure DevOps organization name
- `project` (string) - Project name
- `token` (string) - Personal Access Token (PAT)
  - Use environment variable: `${AZURE_DEVOPS_TOKEN}`
  - Required scopes: `Code: Read`, `Wiki: Read`
- `resourceTypes` (array) - Types to ingest
  - `repository` - Git repositories
  - `wiki` - Project wikis
  - Can specify one or both

**Optional Configuration:**

- `fileTypes` (array) - File extensions to ingest

  - Default: All files
  - Examples: `.md`, `.txt`, `.json`, `.yaml`

- `repositories` (array) - Repository-specific config
  - `name` (string, required) - Repository name
  - `fileTypes` (array, optional) - Override global fileTypes

**Module Required:**

```typescript
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-azure-devops'
  ),
);
```

**Azure DevOps PAT Setup:**

1. Navigate to User Settings > Personal Access Tokens
2. Create new token
3. Grant scopes: `Code: Read`, `Wiki: Read`
4. Copy token (shown once)

**What's Ingested:**

- Repository files
- Wiki pages
- File metadata
- Project information

## Advanced Configuration

### Multiple Environments

Use different configurations per environment:

```yaml
# app-config.yaml (base)
aiAssistant:
  storage:
    pgVector:
      chunkSize: 500

---
# app-config.production.yaml (production overrides)
aiAssistant:
  storage:
    pgVector:
      chunkSize: 800
      amount: 15
  ingestion:
    schedule:
      frequency:
        days: 1
      timeout:
        hours: 2
```

### Secret Management

Use environment variables or file references for sensitive data:

**Environment Variables:**

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_API_KEY}
```

**File References:**

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      apiKey:
        $file: /etc/secrets/azure-openai-key
```

**Best Practices:**

- Never commit secrets to version control
- Use secret management systems (Azure Key Vault, AWS Secrets Manager)
- Rotate credentials regularly
- Use minimal permission scopes

### Database Configuration

The plugin uses the Backstage database configuration. Ensure pgvector is installed:

```yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      database: ${POSTGRES_DB}
```

**PostgreSQL Requirements:**

- Version: 12+
- Extension: pgvector
- Install: `CREATE EXTENSION IF NOT EXISTS vector;`

## Environment Variables

Common environment variables used in configuration:

| Variable               | Purpose                | Example                         |
| ---------------------- | ---------------------- | ------------------------------- |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key   | `sk-...`                        |
| `AZURE_AI_API_KEY`     | Azure AI API key       | `abc123...`                     |
| `GITHUB_PRIVATE_KEY`   | GitHub App private key | `-----BEGIN RSA...`             |
| `AZURE_DEVOPS_TOKEN`   | Azure DevOps PAT       | `abc123...`                     |
| `POSTGRES_HOST`        | Database host          | `localhost`                     |
| `POSTGRES_PORT`        | Database port          | `5432`                          |
| `POSTGRES_USER`        | Database user          | `backstage`                     |
| `POSTGRES_PASSWORD`    | Database password      | `secret`                        |
| `POSTGRES_DB`          | Database name          | `backstage_plugin_ai_assistant` |

## Configuration Examples

### Minimal Configuration

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      deploymentName: text-embedding-3-small
      instanceName: eastus
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
      openAIApiVersion: 2024-12-01-preview

  models:
    azureAi:
      apiKey: ${AZURE_AI_API_KEY}
      models:
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: gpt-4o-mini
```

### Production Configuration

```yaml
aiAssistant:
  prompt:
    identity: |
      You are an AI assistant for ACME Corp's engineering team.
      Answer questions using provided context from our documentation,
      code repositories, and internal wikis. Be concise and accurate.

  conversation:
    summaryModel: gpt-4o-mini

  storage:
    pgVector:
      chunkSize: 800
      amount: 15

  ingestion:
    schedule:
      frequency:
        days: 1
      timeout:
        hours: 2

  embeddings:
    azureOpenAi:
      deploymentName: text-embedding-3-large
      instanceName: eastus
      apiKey:
        $file: /run/secrets/azure-openai-key
      endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
      openAIApiVersion: 2024-12-01-preview

  models:
    azureAi:
      apiKey:
        $file: /run/secrets/azure-ai-key
      models:
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: gpt-4o
        - endpoint: https://eastus.api.cognitive.microsoft.com/openai/v1/
          modelName: gpt-4o-mini

ingestors:
  github:
    owner: acme-corp
    appId: 123456
    privateKey:
      $file: /run/secrets/github-app-key
    installationId: 12345678
    fileTypes:
      - .md
      - .mdx
    repositories:
      - name: platform-docs
      - name: api-specs
        fileTypes:
          - .yaml
          - .json
```

### Local Development Configuration

```yaml
aiAssistant:
  storage:
    pgVector:
      chunkSize: 500
      amount: 5

  ingestion:
    schedule:
      frequency:
        hours: 1
      timeout:
        minutes: 15

  embeddings:
    ollama:
      model: nomic-embed-text
      baseUrl: http://localhost:11434

  models:
    ollama:
      baseUrl: http://localhost:11434
      models:
        - llama3.2
        - mistral
```

## Configuration Validation

The plugin validates configuration on startup. Common errors:

- **Missing required fields**: Check all required options are present
- **Invalid API keys**: Verify credentials are correct
- **Unreachable endpoints**: Check network connectivity and URLs
- **Model not found**: Ensure model is deployed/pulled
- **Database connection failed**: Verify PostgreSQL is running and accessible

For troubleshooting configuration issues, see [Troubleshooting Guide](./troubleshooting.md).

---

**Next Steps:**

- [Deploy to production](./deployment.md)
- [Create custom ingestors](./custom-ingestor.md)
- [Develop custom tools](./custom-tools.md)
