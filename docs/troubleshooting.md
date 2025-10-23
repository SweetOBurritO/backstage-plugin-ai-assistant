# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the AI Assistant plugin.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Configuration Issues](#configuration-issues)
- [Ingestion Issues](#ingestion-issues)
- [Runtime Issues](#runtime-issues)
- [Performance Issues](#performance-issues)
- [API and Integration Issues](#api-and-integration-issues)
- [Getting Help](#getting-help)

## Quick Diagnostics

### Health Check

1. **Check backend is running**:

   ```bash
   curl http://localhost:7007/healthcheck
   ```

2. **Check API endpoint**:

   ```bash
   curl http://localhost:7007/api/ai-assistant/models
   ```

3. **Check database connection**:

   ```bash
   psql -U backstage -d backstage -c "SELECT COUNT(*) FROM embeddings;"
   ```

4. **Check logs**:
   ```bash
   # Look for errors in backend logs
   yarn start-backend
   # Watch for errors or warnings
   ```

### Common Symptoms

| Symptom                    | Likely Cause                  | Section                                       |
| -------------------------- | ----------------------------- | --------------------------------------------- |
| Plugin not appearing in UI | Frontend not installed        | [Installation Issues](#installation-issues)   |
| "No models available"      | Backend module not registered | [Configuration Issues](#configuration-issues) |
| Slow responses             | Too many context documents    | [Performance Issues](#performance-issues)     |
| Database errors            | pgvector not installed        | [Database Issues](#database-issues)           |
| Ingestion fails            | API credentials invalid       | [Ingestion Issues](#ingestion-issues)         |
| Chat not working           | Missing embeddings provider   | [Configuration Issues](#configuration-issues) |

## Installation Issues

### Issue: Plugin Not Appearing in UI

**Symptoms**:

- `/ai-assistant` route shows 404
- No AI Assistant menu item

**Solutions**:

1. **Verify frontend installation**:

   ```bash
   # Check package.json
   grep "backstage-plugin-ai-assistant" packages/app/package.json
   ```

2. **Check route is added** in `packages/app/src/App.tsx`:

   ```typescript
   import { AiAssistantPage } from '@sweetoburrito/backstage-plugin-ai-assistant';

   <Route path="/ai-assistant" element={<AiAssistantPage />} />;
   ```

3. **Rebuild frontend**:
   ```bash
   yarn build:app
   yarn start
   ```

### Issue: Backend Module Not Found

**Symptoms**:

- `Cannot find module '@sweetoburrito/backstage-plugin-ai-assistant-backend'`

**Solutions**:

1. **Install backend package**:

   ```bash
   yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend
   ```

2. **Clear cache and reinstall**:

   ```bash
   yarn cache clean
   rm -rf node_modules
   yarn install
   ```

3. **Check workspace configuration** in root `package.json`:
   ```json
   {
     "workspaces": {
       "packages": ["packages/*", "plugins/*"]
     }
   }
   ```

### Issue: TypeScript Errors

**Symptoms**:

- Type errors during build
- `Cannot find type definitions`

**Solutions**:

1. **Rebuild TypeScript**:

   ```bash
   yarn tsc:full
   ```

2. **Check TypeScript version**:

   ```bash
   yarn why typescript
   # Should be ~5.8.0
   ```

3. **Clear TypeScript cache**:
   ```bash
   rm -rf packages/*/dist
   yarn tsc --build --clean
   yarn tsc
   ```

## Database Issues

### Issue: pgvector Extension Not Found

**Symptoms**:

- `ERROR: extension "vector" does not exist`
- `function vector_out(vector) does not exist`

**Solutions**:

1. **Install pgvector** (see platform-specific instructions):

   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-16-pgvector

   # macOS
   brew install pgvector
   ```

2. **Enable extension in database**:

   ```sql
   psql -U postgres -d backstage
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Verify installation**:

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

4. **For cloud databases**:
   - **Azure**: Use Flexible Server and enable in portal
   - **AWS RDS**: Add to parameter group
   - **Google Cloud SQL**: Enable `pgvector` flag

### Issue: Migration Errors

**Symptoms**:

- `relation "embeddings" does not exist`
- `column "vector" does not exist`

**Solutions**:

1. **Check if migrations ran**:

   ```sql
   SELECT * FROM knex_migrations;
   ```

2. **Manually run migrations** (if needed):

   ```bash
   # Migrations run automatically, but check logs
   yarn start-backend
   # Look for migration messages
   ```

3. **Reset database** (CAUTION: loses data):
   ```sql
   DROP TABLE IF EXISTS embeddings CASCADE;
   DROP TABLE IF EXISTS conversation CASCADE;
   DROP TABLE IF EXISTS conversations CASCADE;
   -- Restart backend to re-run migrations
   ```

### Issue: Database Connection Failed

**Symptoms**:

- `Connection refused`
- `password authentication failed`

**Solutions**:

1. **Verify database is running**:

   ```bash
   pg_isready -h localhost -p 5432
   ```

2. **Check credentials** in `app-config.yaml`:

   ```yaml
   backend:
     database:
       client: pg
       connection:
         host: localhost
         port: 5432
         user: backstage
         password: ${POSTGRES_PASSWORD}
   ```

3. **Test connection**:

   ```bash
   psql -h localhost -U backstage -d backstage
   ```

4. **Check PostgreSQL logs**:
   ```bash
   # Location varies by platform
   tail -f /var/log/postgresql/postgresql-16-main.log
   ```

## Configuration Issues

### Issue: No Models Available

**Symptoms**:

- "No models available" in UI
- Empty model list in API response

**Solutions**:

1. **Verify model provider module is registered** in `packages/backend/src/index.ts`:

   ```typescript
   backend.add(
     import(
       '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
     ),
   );
   ```

2. **Check model configuration** in `app-config.yaml`:

   ```yaml
   aiAssistant:
     models:
       azureAi:
         apiKey: ${AZURE_AI_API_KEY}
         models:
           - endpoint: https://...
             modelName: gpt-4o
   ```

3. **Verify API key is set**:

   ```bash
   echo $AZURE_AI_API_KEY
   ```

4. **Check backend logs** for model registration:
   ```
   [ai-assistant] Registered model: gpt-4o
   ```

### Issue: Embeddings Provider Not Configured

**Symptoms**:

- `No embeddings provider registered`
- Ingestion fails with embedding errors

**Solutions**:

1. **Register embeddings provider** in `packages/backend/src/index.ts`:

   ```typescript
   backend.add(
     import(
       '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
     ),
   );
   ```

2. **Configure in `app-config.yaml`**:

   ```yaml
   aiAssistant:
     embeddings:
       azureOpenAi:
         deploymentName: text-embedding-3-large
         apiKey: ${AZURE_OPENAI_API_KEY}
         endpoint: https://...
   ```

3. **Only one embeddings provider** can be active at a time

### Issue: Invalid Configuration

**Symptoms**:

- Backend fails to start
- `Configuration validation failed`

**Solutions**:

1. **Validate YAML syntax**:

   ```bash
   # Use yamllint or online validator
   yamllint app-config.yaml
   ```

2. **Check required fields**:

   - All API keys are set
   - Endpoints are valid URLs
   - Enum values are correct (e.g., `celsius` vs `Celsius`)

3. **Use environment variables** for secrets:
   ```yaml
   apiKey: ${API_KEY} # Not: apiKey: $API_KEY
   ```

## Ingestion Issues

### Issue: Ingestion Job Not Running

**Symptoms**:

- No embeddings in database
- Vector search returns no results

**Solutions**:

1. **Check if ingestors are registered**:

   ```typescript
   backend.add(
     import(
       '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog'
     ),
   );
   ```

2. **Verify schedule configuration**:

   ```yaml
   aiAssistant:
     ingestion:
       schedule:
         frequency:
           days: 1
         timeout:
           hours: 1
   ```

3. **Check logs** for ingestion start:

   ```
   [ai-assistant] Starting data ingestion...
   [ai-assistant] Ingestors available: catalog, github
   ```

4. **Manually trigger** (requires scheduler API access):
   ```bash
   # Restart backend to trigger immediate ingestion
   yarn start-backend
   ```

### Issue: GitHub Ingestor Fails

**Symptoms**:

- `Failed to fetch GitHub repositories`
- `Authentication failed`

**Solutions**:

1. **Verify GitHub App credentials**:

   ```yaml
   ingestors:
     github:
       owner: my-org
       appId: 123456
       privateKey: ${GITHUB_PRIVATE_KEY}
       installationId: 12345678
   ```

2. **Check GitHub App permissions**:

   - App must have `Contents: Read` permission
   - App must be installed on repositories

3. **Verify private key format**:

   ```bash
   # Should start with -----BEGIN RSA PRIVATE KEY-----
   echo "$GITHUB_PRIVATE_KEY" | head -1
   ```

4. **Test GitHub API access**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.github.com/installation/repositories
   ```

### Issue: Catalog Ingestor Fails

**Symptoms**:

- Catalog entities not indexed
- `Failed to fetch catalog entities`

**Solutions**:

1. **Verify catalog service is running**:

   ```bash
   curl http://localhost:7007/api/catalog/entities
   ```

2. **Check authentication**:

   - Catalog ingestor uses service-to-service auth
   - Ensure Backstage auth is configured correctly

3. **Check catalog has entities**:
   ```bash
   curl http://localhost:7007/api/catalog/entities | jq '.items | length'
   ```

## Runtime Issues

### Issue: Chat Request Fails

**Symptoms**:

- Error when sending message
- 500 Internal Server Error

**Solutions**:

1. **Check backend logs** for specific error

2. **Verify conversation ID** (if continuing conversation):

   ```bash
   # List conversations
   curl http://localhost:7007/api/ai-assistant/conversations
   ```

3. **Check model availability**:

   ```bash
   curl http://localhost:7007/api/ai-assistant/models
   ```

4. **Test with minimal message**:
   ```bash
   curl -X POST http://localhost:7007/api/ai-assistant/chat \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "human", "content": "Hello"}],
       "modelId": "gpt-4o",
       "conversationId": "test"
     }'
   ```

### Issue: Streaming Not Working

**Symptoms**:

- No real-time updates
- Full response appears at once

**Solutions**:

1. **Verify Backstage Signals plugin** is installed and running

2. **Check WebSocket connection**:

   - Browser DevTools → Network → WS
   - Should see WebSocket connection

3. **Check CORS settings**:
   ```yaml
   backend:
     cors:
       origin: http://localhost:3000
       credentials: true
   ```

### Issue: Tool Execution Fails

**Symptoms**:

- AI mentions using a tool but it doesn't work
- Tool returns error

**Solutions**:

1. **Check tool registration**:

   ```typescript
   tools.register(myTool);
   ```

2. **Verify tool schema** is valid Zod schema

3. **Check tool function** handles errors:

   ```typescript
   func: async params => {
     try {
       // ... implementation
     } catch (error) {
       return `Error: ${error.message}`;
     }
   };
   ```

4. **Check logs** for tool execution:
   ```
   [ai-assistant] Executing tool: searchKnowledge
   ```

## Performance Issues

### Issue: Slow Response Times

**Symptoms**:

- Chat takes >10 seconds to respond
- Timeout errors

**Solutions**:

1. **Reduce context documents**:

   ```yaml
   aiAssistant:
     storage:
       pgVector:
         amount: 5 # Reduce from 10-15
   ```

2. **Optimize vector search**:

   ```sql
   -- Create index if missing
   CREATE INDEX ON embeddings USING ivfflat (vector vector_cosine_ops);
   ```

3. **Use faster model**:

   - Switch to `gpt-4o-mini` from `gpt-4o`
   - Use `gpt-3.5-turbo` for simple queries

4. **Enable caching**:
   ```yaml
   backend:
     cache:
       store: memory
   ```

### Issue: High Memory Usage

**Symptoms**:

- Backend crashes with OOM
- Memory grows over time

**Solutions**:

1. **Reduce batch sizes** in ingestion:

   ```yaml
   ingestors:
     github:
       filesBatchSize: 25 # Reduce from 50
   ```

2. **Limit chunk size**:

   ```yaml
   aiAssistant:
     storage:
       pgVector:
         chunkSize: 500 # Reduce if too high
   ```

3. **Configure Node.js memory**:

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" yarn start-backend
   ```

4. **Restart backend periodically** (for long-running instances)

### Issue: Database Growing Too Large

**Symptoms**:

- Database size increasing rapidly
- Disk space warnings

**Solutions**:

1. **Check embeddings count**:

   ```sql
   SELECT COUNT(*) FROM embeddings;
   ```

2. **Clean up old documents**:

   ```sql
   -- Delete embeddings from removed sources
   DELETE FROM embeddings
   WHERE metadata->>'source' = 'old-source';

   VACUUM FULL embeddings;
   ```

3. **Optimize chunk size**:

   - Larger chunks = fewer embeddings
   - But may reduce search quality

4. **Archive old conversations**:
   ```sql
   -- Archive conversations older than 90 days
   DELETE FROM conversation
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

## API and Integration Issues

### Issue: Azure OpenAI Rate Limits

**Symptoms**:

- `Rate limit exceeded`
- 429 status codes

**Solutions**:

1. **Reduce ingestion frequency**:

   ```yaml
   aiAssistant:
     ingestion:
       schedule:
         frequency:
           days: 7 # Increase from 1
   ```

2. **Implement rate limiting** in custom tools

3. **Upgrade Azure OpenAI tier** for higher limits

4. **Use multiple deployments** and load balance

### Issue: Model Not Responding

**Symptoms**:

- Timeout waiting for model response
- No response returned

**Solutions**:

1. **Check model endpoint**:

   ```bash
   curl https://your-endpoint.openai.azure.com/openai/deployments
   ```

2. **Verify deployment name** matches configuration

3. **Check API key** is valid and not expired

4. **Test directly** with Azure OpenAI API:
   ```bash
   curl https://your-endpoint.openai.azure.com/openai/deployments/gpt-4o/chat/completions \
     -H "api-key: YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "test"}]}'
   ```

### Issue: GitHub API Errors

**Symptoms**:

- `API rate limit exceeded`
- `Resource not accessible`

**Solutions**:

1. **Check rate limit status**:

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.github.com/rate_limit
   ```

2. **Reduce ingestion frequency**

3. **Filter repositories**:

   ```yaml
   ingestors:
     github:
       repositories:
         - name: important-repo
   ```

4. **Use GitHub Enterprise** for higher limits

## Getting Help

### Enable Debug Logging

```yaml
backend:
  logger:
    level: debug # Change from info
```

### Collect Diagnostic Information

When reporting issues, include:

1. **Environment**:

   - Node.js version: `node --version`
   - PostgreSQL version: `psql --version`
   - Plugin version: Check `package.json`

2. **Configuration** (redact secrets):

   ```yaml
   # Relevant sections from app-config.yaml
   ```

3. **Logs**:

   ```
   # Last 100 lines of backend logs
   # Any error messages
   ```

4. **Reproduction steps**:
   - What were you trying to do?
   - What happened instead?
   - Can you reproduce it consistently?

### Resources

- **GitHub Issues**: [Report bugs or request features](https://github.com/SweetOBurritO/backstage-plugin-ai-assistant/issues)
- **Architecture Guide**: [Understand system design](./architecture.md)
- **Configuration Guide**: [Check configuration options](./configuration.md)
- **Deployment Guide**: [Review deployment setup](./deployment.md)

### Common Error Messages

| Error Message                       | Meaning                   | Solution                         |
| ----------------------------------- | ------------------------- | -------------------------------- |
| `extension "vector" does not exist` | pgvector not installed    | Install pgvector extension       |
| `No embeddings provider registered` | Missing embeddings module | Add embeddings provider module   |
| `Rate limit exceeded`               | API rate limit hit        | Reduce request frequency         |
| `Authentication failed`             | Invalid credentials       | Verify API keys                  |
| `Connection refused`                | Service not reachable     | Check network and service status |
| `Module not found`                  | Package not installed     | Run `yarn install`               |
| `Configuration validation failed`   | Invalid config            | Check YAML syntax and values     |

---

**Still having issues?** Open an issue on GitHub with diagnostic information, and we'll help you resolve it.
