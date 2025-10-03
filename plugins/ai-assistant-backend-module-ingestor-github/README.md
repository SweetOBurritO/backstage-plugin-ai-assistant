# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github

The GitHub ingestor backend module for the AI Assistant plugin. This module enables Platty AI to ingest documentation and catalog-info files from GitHub repositories for Retrieval Augmented Generation (RAG).

## Features

- **Repository Discovery**: Automatically discovers repositories for a specified GitHub owner/organization
- **Configurable File Filtering**: Ingest specific file types (markdown, catalog-info.yaml, etc.)
- **Repository Targeting**: Configure which repositories to ingest (all, specific names, or patterns)
- **Error Handling**: Graceful handling of API failures and missing files
- **Rate Limiting**: Respects GitHub API rate limits
- **GitHub Enterprise Support**: Works with both GitHub.com and GitHub Enterprise installations

## Installation

This module is part of the AI Assistant plugin ecosystem. To use it, you need to:

1. Install the module in your Backstage backend
2. Configure the GitHub integration in your `app-config.yaml`
3. Register the module in your backend setup

## Configuration

Add the following configuration to your `app-config.yaml`:

```yaml
aiAssistant:
  ingestors:
    github:
      # Required: GitHub owner/organization name
      owner: 'your-github-username-or-org'
      
      # Required: GitHub App ID
      appId: '${GITHUB_APP_ID}'
      
      # Required: GitHub App private key (PEM format)
      privateKey: '${GITHUB_PRIVATE_KEY}'
      
      # Required: GitHub App installation ID
      installationId: '${GITHUB_INSTALLATION_ID}'
      
      # Optional: GitHub Enterprise URL (defaults to https://api.github.com)
      baseUrl: 'https://your-github-enterprise.com/api/v3'
      
      # Optional: Global file types to ingest (defaults to .md and .json)
      fileTypes:
        - '.md'
        - '.json'
        - '.yaml'
        - '.yml'
        - 'catalog-info.yaml'
      
      # Optional: Specific repositories to ingest
      # If not specified, all repositories for the owner will be ingested
      repositories:
        - name: 'backstage-plugin-ai-assistant'
          # Optional: Override file types for this specific repository
          fileTypes:
            - '.md'
            - 'catalog-info.yaml'
        - name: 'my-service-docs'
          fileTypes:
            - '.md'
            - '.mdx'
```

## Environment Variables

For security, use environment variables for sensitive configuration:

```bash
# GitHub App credentials
export GITHUB_APP_ID=123456
export GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
export GITHUB_INSTALLATION_ID=78901234
```

## GitHub App Setup

This ingestor uses GitHub App authentication, which is more secure and provides higher rate limits than Personal Access Tokens.

### Creating a GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Click "New GitHub App"
3. Fill in the required fields:
   - **App name**: `Backstage AI Assistant Ingestor`
   - **Homepage URL**: Your Backstage instance URL
   - **Webhook URL**: Can be placeholder if not using webhooks
4. Set permissions:
   - **Repository permissions**:
     - Contents: Read
     - Metadata: Read
5. Choose where the app can be installed (your account/organization)
6. Create the app

### Getting the Required Values

- **App ID**: Found on your GitHub App's settings page
- **Private Key**: Generate and download from your GitHub App's settings page
- **Installation ID**: Install the app on your organization/account, then find the installation ID in the URL or API

## Supported File Types

The ingestor can process any text-based file types. Common configurations include:

- **Documentation**: `.md`, `.mdx`, `.rst`, `.txt`
- **Configuration**: `.yaml`, `.yml`, `.json`
- **Catalog Files**: `catalog-info.yaml`, `mkdocs.yml`
- **Code Documentation**: `.ts`, `.js`, `.py` (for inline documentation)

## Repository Filtering

### Ingest All Repositories
```yaml
aiAssistant:
  ingestors:
    github:
      owner: 'myorg'
      token: '${GITHUB_TOKEN}'
      # No 'repositories' config = ingest all repos
```

### Ingest Specific Repositories
```yaml
aiAssistant:
  ingestors:
    github:
      owner: 'myorg'
      token: '${GITHUB_TOKEN}'
      repositories:
        - name: 'docs-repo'
        - name: 'service-catalog'
        - name: 'platform-docs'
```

### Per-Repository File Filtering
```yaml
aiAssistant:
  ingestors:
    github:
      owner: 'myorg'
      token: '${GITHUB_TOKEN}'
      repositories:
        - name: 'service-docs'
          fileTypes: ['.md', '.mdx']
        - name: 'catalog-repo'
          fileTypes: ['catalog-info.yaml', '.md']
```

## Backend Integration

Register the module in your backend:

```typescript
// packages/backend/src/index.ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Register the GitHub ingestor module
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github'));

backend.start();
```

## Monitoring and Logging

The ingestor provides comprehensive logging for monitoring:

- Repository discovery and filtering
- File ingestion progress
- API rate limit handling
- Error conditions and retries

Logs are available in your Backstage backend logs with the `github-ingestor` prefix.

## Troubleshooting

### Common Issues

1. **"Missing required config value at 'aiAssistant.ingestors.github.owner'"**
   - Ensure the `owner` field is configured in your `app-config.yaml`

2. **"GitHub owner and token are required"**
   - Verify both `owner` and `token` are configured
   - Check that environment variables are properly set

3. **API Rate Limiting**
   - The ingestor respects GitHub's rate limits
   - Consider using a GitHub App token for higher rate limits
   - Monitor your API usage in GitHub settings

4. **No files found for ingestion**
   - Check your `fileTypes` configuration
   - Verify repository names are spelled correctly
   - Ensure the token has access to the specified repositories

### Debug Mode

Enable debug logging by setting the log level:

```yaml
backend:
  logger:
    level: debug
```

## Performance Considerations

- **Initial Ingestion**: Large repositories may take time for initial ingestion
- **Rate Limits**: GitHub API has rate limits (5000 requests/hour for authenticated users)
- **File Size**: Very large files may impact embedding performance
- **Repository Count**: Consider filtering repositories to those with relevant documentation

## Security

- Store GitHub tokens as environment variables, not in configuration files
- Use GitHub Apps for organization-wide access when possible
- Regularly rotate access tokens
- Monitor token usage and permissions

## Contributing

This module follows the standard Backstage plugin development practices. See the main AI Assistant plugin documentation for contribution guidelines.
