# Deployment Guide

This guide covers deploying the AI Assistant plugin to production environments, including installation, database setup, and production best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Production Considerations](#production-considerations)
- [Deployment Methods](#deployment-methods)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)

## Prerequisites

### System Requirements

- **Node.js**: Version 20 or 22 (LTS recommended)
- **PostgreSQL**: Version 12+ with pgvector extension
- **Memory**: Minimum 2GB RAM (4GB+ recommended for production)
- **Storage**: Varies based on knowledge base size
  - Estimate: 1MB per 500 documents
  - Plan for 2-3x growth

### Required Services

- **Backstage Instance**: Compatible with new backend system
- **LLM Provider**: One of:
  - Azure OpenAI / Azure AI
  - Ollama (self-hosted)
  - Other LangChain-compatible providers

### API Keys and Credentials

Prepare the following:

- Embeddings provider API key
- Model provider API key
- Ingestor credentials (GitHub App, Azure DevOps PAT, etc.)
- Database connection credentials

## Installation

### Step 1: Install Packages

Install the plugin packages in your Backstage instance:

```bash
# Navigate to your Backstage root directory
cd /path/to/your/backstage

# Install frontend plugin
yarn add @sweetoburrito/backstage-plugin-ai-assistant

# Install backend plugin
yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend

# Install required modules (example for Azure OpenAI)
yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai
yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai
yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog

# Install optional ingestor modules
yarn --cwd packages/backend add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github
```

### Step 2: Add Frontend Plugin

Edit `packages/app/src/App.tsx`:

```typescript
import { AiAssistantPage } from '@sweetoburrito/backstage-plugin-ai-assistant';

// Add to your routes
const routes = (
  <FlatRoutes>
    {/* Existing routes */}
    <Route path="/ai-assistant" element={<AiAssistantPage />} />
  </FlatRoutes>
);
```

**Optional**: Add navigation menu item in `packages/app/src/components/Root/Root.tsx`:

```typescript
import SmartToyIcon from '@material-ui/icons/SmartToy';

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      {/* Existing items */}
      <SidebarItem icon={SmartToyIcon} to="ai-assistant" text="AI Assistant" />
    </Sidebar>
    {children}
  </SidebarPage>
);
```

### Step 3: Add Backend Plugin

Edit `packages/backend/src/index.ts`:

```typescript
// Add core plugin
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add embeddings provider (choose one)
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
  ),
);
// OR
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama'
  ),
);

// Add model provider(s)
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
  ),
);
// AND/OR
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama'
  ),
);

// Add ingestors
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog'
  ),
);
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-github'
  ),
);
// Optional: Azure DevOps ingestor
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-azure-devops'
  ),
);
```

### Step 4: Build

```bash
# Build the backend
yarn build:backend

# Or build everything
yarn build:all
```

## Database Setup

### PostgreSQL with pgvector

#### Option 1: Docker (Development/Testing)

```bash
# docker-compose.yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: backstage
      POSTGRES_PASSWORD: backstage_secret
      POSTGRES_DB: backstage
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

Start the database:

```bash
docker-compose up -d
```

#### Option 2: Existing PostgreSQL

Install pgvector extension on your existing PostgreSQL instance:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-16-pgvector

# macOS
brew install pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

Enable the extension:

```sql
-- Connect to your database
psql -U postgres -d backstage

-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### Option 3: Cloud Providers

**Azure Database for PostgreSQL**:

- Ensure Flexible Server (not Single Server)
- PostgreSQL version 12+
- Enable `pgvector` extension in Azure Portal
- Note: Some plans have vector dimension limits

**AWS RDS**:

- Use PostgreSQL 12+
- Enable `pgvector` via parameter groups
- May require custom parameter group

**Google Cloud SQL**:

- PostgreSQL 14+
- Enable `pgvector` flag
- Check Cloud SQL documentation for compatibility

### Database Migration

The plugin automatically runs migrations on first start. Ensure:

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

**Manual Migration** (if needed):

The migrations are located in `plugins/ai-assistant-backend/migrations/`. They will run automatically, but you can verify:

```bash
# Check database for tables
psql -U backstage -d backstage -c "\dt"

# Should see:
# - embeddings
# - conversation
# - conversations
# - tools (if applicable)
```

### Database Maintenance

**Vacuum and Analyze** (recommended weekly):

```sql
-- Vacuum embeddings table
VACUUM ANALYZE embeddings;

-- Vacuum conversation tables
VACUUM ANALYZE conversation;
VACUUM ANALYZE conversations;
```

**Index Maintenance**:

```sql
-- Rebuild indexes if needed
REINDEX TABLE embeddings;
```

## Configuration

### Environment-Specific Configuration

Use separate config files for different environments:

```bash
# app-config.yaml - Base configuration
# app-config.local.yaml - Local overrides (gitignored)
# app-config.production.yaml - Production config
```

**Example Structure**:

```yaml
# app-config.yaml (base)
aiAssistant:
  storage:
    pgVector:
      chunkSize: 500
      amount: 10

---
# app-config.production.yaml (production)
aiAssistant:
  storage:
    pgVector:
      chunkSize: 800 # Larger chunks for production
      amount: 15 # More context in production

  ingestion:
    schedule:
      frequency:
        days: 1
      timeout:
        hours: 2
```

### Secrets Management

**Never commit secrets to version control!**

#### Option 1: Environment Variables

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: ${AZURE_OPENAI_ENDPOINT}
```

#### Option 2: File References

```yaml
aiAssistant:
  embeddings:
    azureOpenAi:
      apiKey:
        $file: /run/secrets/azure-openai-key
```

#### Option 3: Secret Management Services

**Azure Key Vault**:

```bash
# Fetch secrets at runtime
export AZURE_OPENAI_API_KEY=$(az keyvault secret show --name openai-key --vault-name myvault --query value -o tsv)
```

**AWS Secrets Manager**:

```bash
export AZURE_OPENAI_API_KEY=$(aws secretsmanager get-secret-value --secret-id openai-key --query SecretString --output text)
```

**HashiCorp Vault**:

```bash
export AZURE_OPENAI_API_KEY=$(vault kv get -field=api_key secret/openai)
```

### Required Configuration

Minimum production configuration:

```yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: 5432
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      database: ${POSTGRES_DB}

aiAssistant:
  prompt:
    identity: |
      You are an AI assistant for [Company Name].
      Answer questions using provided context.

  embeddings:
    azureOpenAi:
      deploymentName: text-embedding-3-large
      instanceName: ${AZURE_REGION}
      apiKey: ${AZURE_OPENAI_API_KEY}
      endpoint: ${AZURE_OPENAI_ENDPOINT}
      openAIApiVersion: 2024-12-01-preview

  models:
    azureAi:
      apiKey: ${AZURE_AI_API_KEY}
      models:
        - endpoint: ${AZURE_AI_ENDPOINT}
          modelName: gpt-4o

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

## Production Considerations

### Performance

**Database Optimization**:

- Use connection pooling (built-in with Backstage)
- Set appropriate `max_connections` in PostgreSQL
- Configure `shared_buffers` (25% of RAM)
- Enable query logging for optimization

**Vector Search**:

- Create appropriate indexes on embeddings table
- Monitor query performance
- Consider `work_mem` settings for large result sets

**Caching**:

- Enable Backstage cache service
- Cache conversation summaries
- Cache frequently accessed embeddings

### Security

**API Keys**:

- Rotate credentials regularly (90 days recommended)
- Use separate keys for dev/staging/production
- Implement least-privilege access
- Monitor key usage

**Network Security**:

- Use HTTPS/TLS for all connections
- Implement firewall rules
- Restrict database access to backend only
- Use VPC/private networks where possible

**Data Privacy**:

- Be aware of data sent to LLM providers
- Implement data retention policies
- Consider GDPR/compliance requirements
- Audit conversation logs

**Access Control**:

- Integrate with Backstage permissions
- Implement user-scoped conversations
- Limit access to sensitive tools
- Audit tool usage

### Reliability

**Health Checks**:

```yaml
# Kubernetes health check example
livenessProbe:
  httpGet:
    path: /healthcheck
    port: 7007
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthcheck
    port: 7007
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Error Handling**:

- Implement retry logic for API calls
- Handle rate limits gracefully
- Log errors comprehensively
- Set up alerting

**Failover**:

- Configure multiple model providers
- Implement fallback mechanisms
- Use circuit breakers for external services

### Resource Limits

**Memory**:

```yaml
# Kubernetes resource limits example
resources:
  requests:
    memory: '2Gi'
    cpu: '500m'
  limits:
    memory: '4Gi'
    cpu: '2000m'
```

**Ingestion**:

- Limit batch sizes
- Set timeouts appropriately
- Monitor job completion
- Handle failures gracefully

## Deployment Methods

### Docker

**Dockerfile** (if not already present):

```dockerfile
FROM node:20-bookworm-slim

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN yarn install --frozen-lockfile --production

# Copy built backend
COPY packages/backend/dist ./packages/backend/dist

# Expose port
EXPOSE 7007

# Start backend
CMD ["node", "packages/backend"]
```

**Build and Run**:

```bash
# Build
docker build -t my-backstage-backend .

# Run
docker run -p 7007:7007 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=backstage \
  -e POSTGRES_PASSWORD=secret \
  -e AZURE_OPENAI_API_KEY=your-key \
  my-backstage-backend
```

### Kubernetes

**Deployment** (`deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backstage-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backstage-backend
  template:
    metadata:
      labels:
        app: backstage-backend
    spec:
      containers:
        - name: backstage
          image: my-backstage-backend:latest
          ports:
            - containerPort: 7007
          env:
            - name: POSTGRES_HOST
              value: postgres-service
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secrets
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secrets
                  key: password
            - name: AZURE_OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: azure-secrets
                  key: openai-api-key
          resources:
            requests:
              memory: '2Gi'
              cpu: '500m'
            limits:
              memory: '4Gi'
              cpu: '2000m'
          livenessProbe:
            httpGet:
              path: /healthcheck
              port: 7007
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthcheck
              port: 7007
            initialDelaySeconds: 10
            periodSeconds: 5
```

**Service** (`service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backstage-backend
spec:
  selector:
    app: backstage-backend
  ports:
    - protocol: TCP
      port: 7007
      targetPort: 7007
  type: LoadBalancer
```

**Apply**:

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### Cloud Platforms

**Azure App Service**:

```bash
# Create app service
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name my-backstage \
  --deployment-container-image-name my-backstage-backend:latest

# Configure environment variables
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name my-backstage \
  --settings POSTGRES_HOST=mypostgres.postgres.database.azure.com
```

**AWS ECS**:

- Create task definition with container image
- Configure environment variables
- Set up load balancer
- Deploy service

**Google Cloud Run**:

```bash
gcloud run deploy backstage-backend \
  --image gcr.io/my-project/backstage-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars POSTGRES_HOST=postgres-ip
```

## Monitoring

### Logging

Configure structured logging:

```yaml
backend:
  logger:
    level: info # info, warn, error, debug
    format: json # json or pretty
```

**Key Logs to Monitor**:

- Ingestion job start/completion
- Tool execution
- API errors
- Database connection issues
- Model provider failures

### Metrics

**Key Metrics**:

- Request rate and latency
- Embedding generation time
- Vector search performance
- Conversation count and length
- Error rates
- Database query performance

**Tools**:

- Prometheus + Grafana
- Datadog
- New Relic
- Azure Application Insights

### Alerting

Set up alerts for:

- High error rates (>5%)
- Slow response times (>5s)
- Database connection failures
- Ingestion job failures
- API rate limit exceeded
- Disk space low

## Backup and Recovery

### Database Backups

**Automated Backups** (daily recommended):

```bash
# PostgreSQL dump
pg_dump -U backstage -d backstage > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U backstage -d backstage | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Cloud Provider Backups**:

- Azure Database: Enable automated backups (7-35 day retention)
- AWS RDS: Enable automated backups
- Google Cloud SQL: Configure automated backups

### Restore Procedure

```bash
# Restore from backup
psql -U backstage -d backstage < backup_20250101.sql

# Or from compressed
gunzip -c backup_20250101.sql.gz | psql -U backstage -d backstage
```

### Disaster Recovery

**Recovery Time Objective (RTO)**: Target 4 hours
**Recovery Point Objective (RPO)**: Target 24 hours

**Recovery Steps**:

1. Restore database from latest backup
2. Deploy backend from known good image/tag
3. Verify configuration
4. Run health checks
5. Trigger ingestion job (if needed)
6. Monitor for errors

## Scaling

### Horizontal Scaling

Run multiple backend instances:

```yaml
# Kubernetes
replicas: 3

# Docker Swarm
docker service scale backstage-backend=3
```

**Considerations**:

- Use load balancer
- Session state (handled by database)
- Ingestion job coordination (only one instance should run)

### Vertical Scaling

Increase resources for single instance:

- More CPU for faster embeddings
- More memory for larger batches
- Faster disk for database performance

### Database Scaling

**Read Replicas**:

- Use for vector searches
- Offload read traffic
- Keep writes on primary

**Connection Pooling**:

```yaml
backend:
  database:
    connection:
      pool:
        min: 2
        max: 10
```

**Partitioning**:

- Partition embeddings table by source
- Partition conversations by date
- Use PostgreSQL declarative partitioning

---

**Next Steps:**

- [Configure the plugin](./configuration.md)
- [Set up monitoring](./troubleshooting.md)
- [Review architecture](./architecture.md)
