# Custom Ingestor Development Guide

This guide walks you through creating custom data ingestors for the AI Assistant plugin. Ingestors fetch data from various sources and prepare it for embedding and vector storage.

## Table of Contents

- [Overview](#overview)
- [Ingestor Interface](#ingestor-interface)
- [Creating a Basic Ingestor](#creating-a-basic-ingestor)
- [Creating a Backend Module](#creating-a-backend-module)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Examples](#examples)

## Overview

### What is an Ingestor?

An ingestor is a service that:

1. Fetches data from a source (API, database, files, etc.)
2. Transforms data into `EmbeddingDocument` format
3. Passes documents to the ingestion pipeline for chunking and embedding
4. Manages document lifecycle (updates, deletions)

### When to Create a Custom Ingestor

Create a custom ingestor when you need to ingest data from:

- Internal APIs or services
- Custom databases
- Third-party platforms (Confluence, Notion, etc.)
- File systems or object storage
- Any structured or unstructured data source

### Architecture

```
Custom Ingestor
      │
      ├─→ Fetch Data from Source
      │
      ├─→ Transform to EmbeddingDocument[]
      │
      ├─→ Call saveDocumentsBatch()
      │
      └─→ Ingestion Pipeline
            │
            ├─→ Text Chunking
            ├─→ Embedding Generation
            └─→ Vector Storage
```

## Ingestor Interface

### Core Types

```typescript
import {
  Ingestor,
  IngestorOptions,
  EmbeddingDocument,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

type Ingestor = {
  id: string; // Unique identifier for your ingestor
  ingest: (options: IngestorOptions) => Promise<EmbeddingDocument[] | void>;
};

type IngestorOptions = {
  saveDocumentsBatch: (documents: EmbeddingDocument[]) => Promise<void>;
};

type EmbeddingDocument = {
  content: string; // Text content to embed
  metadata: {
    source: string; // Your ingestor ID
    id: string; // Unique document ID
    [key: string]: any; // Custom metadata
  };
};
```

### Key Concepts

**Ingestor ID**: Unique identifier (e.g., `'confluence'`, `'notion'`)

- Used as `source` in metadata
- Enables filtering and document management
- Should be consistent across ingestions

**Document ID**: Unique identifier for each document

- Format: `{resource-type}:{resource-id}` (e.g., `page:12345`)
- Used to replace old versions of documents
- Should remain stable across ingestions

**saveDocumentsBatch**: Callback function

- Call this to save documents for embedding
- Can be called multiple times during ingestion
- Handles chunking and embedding automatically
- Old documents with same `source` + `id` are replaced

## Creating a Basic Ingestor

### Step 1: Set Up Your Module

Create a new package in the `plugins/` directory:

```bash
cd plugins
yarn backstage-cli new --select backend-module
# Name: ai-assistant-backend-module-ingestor-custom
# ID: ingestor-custom
```

### Step 2: Define Configuration Schema

Create `config.d.ts` to define configuration:

```typescript
// config.d.ts
export interface Config {
  aiAssistant?: {
    ingestors?: {
      custom?: {
        /**
         * API endpoint URL
         */
        apiUrl: string;

        /**
         * API key for authentication
         * @visibility secret
         */
        apiKey: string;

        /**
         * Optional: Resource types to ingest
         */
        resourceTypes?: string[];
      };
    };
  };
}
```

### Step 3: Implement the Ingestor

Create `src/services/ingestor.ts`:

```typescript
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  Ingestor,
  IngestorOptions,
  EmbeddingDocument,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';

const MODULE_ID = 'custom'; // Your ingestor ID

type CustomIngestorOptions = {
  config: RootConfigService;
  logger: LoggerService;
};

export const createCustomIngestor = async ({
  config,
  logger,
}: CustomIngestorOptions): Promise<Ingestor> => {
  // Read configuration
  const apiUrl = config.getString('aiAssistant.ingestors.custom.apiUrl');
  const apiKey = config.getString('aiAssistant.ingestors.custom.apiKey');
  const resourceTypes = config.getOptionalStringArray(
    'aiAssistant.ingestors.custom.resourceTypes',
  ) ?? ['all'];

  // Create API client
  const fetchData = async (endpoint: string) => {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  };

  // Implement ingest function
  const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
    logger.info('Starting custom data ingestion');

    try {
      // Fetch data from your source
      const data = await fetchData('/api/documents');

      // Transform to EmbeddingDocuments
      const documents: EmbeddingDocument[] = data.items.map((item: any) => ({
        content: `Title: ${item.title}\n\n${item.content}`,
        metadata: {
          source: MODULE_ID,
          id: `document:${item.id}`,
          title: item.title,
          author: item.author,
          createdAt: item.createdAt,
          url: item.url,
        },
      }));

      // Save documents for embedding
      await saveDocumentsBatch(documents);

      logger.info(`Successfully ingested ${documents.length} documents`);
    } catch (error) {
      logger.error('Failed to ingest custom data', error);
      throw error;
    }
  };

  return {
    id: MODULE_ID,
    ingest,
  };
};
```

### Step 4: Create the Backend Module

Create `src/module.ts`:

```typescript
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { dataIngestorExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createCustomIngestor } from './services/ingestor';

export const aiAssistantModuleIngestorCustom = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'ingestor-custom',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        dataIngestor: dataIngestorExtensionPoint,
      },
      async init({ config, logger, dataIngestor }) {
        const ingestor = await createCustomIngestor({ config, logger });
        dataIngestor.registerIngestor(ingestor);
      },
    });
  },
});
```

### Step 5: Export Module

Update `src/index.ts`:

```typescript
export { aiAssistantModuleIngestorCustom as default } from './module';
```

### Step 6: Install and Register

```bash
# Install in your backend
yarn --cwd packages/backend add @internal/backstage-plugin-ai-assistant-backend-module-ingestor-custom

# Add to backend/src/index.ts
backend.add(import('@internal/backstage-plugin-ai-assistant-backend-module-ingestor-custom'));
```

### Step 7: Configure

Add configuration to `app-config.yaml`:

```yaml
aiAssistant:
  ingestors:
    custom:
      apiUrl: https://api.example.com
      apiKey: ${CUSTOM_API_KEY}
      resourceTypes:
        - documents
        - pages
```

## Advanced Patterns

### Batch Processing

Process large datasets in batches to manage memory:

```typescript
const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
  const PAGE_SIZE = 100;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    logger.info(`Fetching page ${page + 1}`);

    const data = await fetchData(
      `/api/documents?page=${page}&size=${PAGE_SIZE}`,
    );

    const documents: EmbeddingDocument[] = data.items.map(transformItem);

    await saveDocumentsBatch(documents);

    hasMore = data.hasNext;
    page++;

    logger.info(`Processed page ${page}, total documents: ${page * PAGE_SIZE}`);
  }

  logger.info(`Ingestion complete. Processed ${page} pages`);
};
```

### Pagination with Cursors

Handle cursor-based pagination:

```typescript
const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
  let cursor: string | null = null;
  let pageCount = 0;

  do {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }
    params.set('limit', '50');

    const data = await fetchData(`/api/documents?${params}`);

    const documents: EmbeddingDocument[] = data.items.map(transformItem);
    await saveDocumentsBatch(documents);

    cursor = data.nextCursor;
    pageCount++;

    logger.info(`Processed page ${pageCount}, cursor: ${cursor || 'none'}`);
  } while (cursor);
};
```

### Recursive Fetching

Fetch hierarchical data (e.g., folders and files):

```typescript
const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
  const processFolder = async (folderId: string) => {
    const folder = await fetchData(`/api/folders/${folderId}`);

    // Process files in this folder
    const documents: EmbeddingDocument[] = folder.files.map(file => ({
      content: file.content,
      metadata: {
        source: MODULE_ID,
        id: `file:${file.id}`,
        folderId: folderId,
        folderPath: folder.path,
        fileName: file.name,
      },
    }));

    await saveDocumentsBatch(documents);

    // Recursively process subfolders
    for (const subfolder of folder.subfolders) {
      await processFolder(subfolder.id);
    }
  };

  // Start from root
  await processFolder('root');
};
```

### Error Handling and Retry

Implement robust error handling:

```typescript
const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
  const MAX_RETRIES = 3;

  const fetchWithRetry = async (
    endpoint: string,
    retries = 0,
  ): Promise<any> => {
    try {
      return await fetchData(endpoint);
    } catch (error) {
      if (retries < MAX_RETRIES) {
        logger.warn(
          `Request failed, retrying (${retries + 1}/${MAX_RETRIES})`,
          error,
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return fetchWithRetry(endpoint, retries + 1);
      }
      throw error;
    }
  };

  try {
    const data = await fetchWithRetry('/api/documents');

    const documents: EmbeddingDocument[] = [];

    for (const item of data.items) {
      try {
        const doc = await transformItem(item);
        documents.push(doc);
      } catch (itemError) {
        logger.warn(`Failed to process item ${item.id}`, itemError);
        // Continue with other items
      }
    }

    if (documents.length > 0) {
      await saveDocumentsBatch(documents);
    }

    logger.info(`Ingestion complete. Processed ${documents.length} documents`);
  } catch (error) {
    logger.error('Ingestion failed', error);
    throw error;
  }
};
```

### Incremental Updates

Only ingest changed documents:

```typescript
const ingest: Ingestor['ingest'] = async ({ saveDocumentsBatch }) => {
  // Store last sync timestamp in cache or database
  const lastSync = await getLastSyncTime();

  const data = await fetchData(
    `/api/documents?modified_since=${lastSync.toISOString()}`,
  );

  if (data.items.length === 0) {
    logger.info('No documents modified since last sync');
    return;
  }

  const documents: EmbeddingDocument[] = data.items.map(transformItem);
  await saveDocumentsBatch(documents);

  // Update last sync time
  await setLastSyncTime(new Date());

  logger.info(`Ingested ${documents.length} modified documents`);
};
```

### Content Enhancement

Enrich content for better search relevance:

```typescript
const createEnhancedContent = (item: any): string => {
  return `
Title: ${item.title}
Author: ${item.author}
Tags: ${item.tags.join(', ')}
Created: ${item.createdAt}
URL: ${item.url}

Description:
${item.description}

Content:
${item.content}

Related Topics: ${item.relatedTopics.join(', ')}
  `.trim();
};

const documents: EmbeddingDocument[] = data.items.map(item => ({
  content: createEnhancedContent(item),
  metadata: {
    source: MODULE_ID,
    id: `document:${item.id}`,
    title: item.title,
    author: item.author,
    tags: item.tags,
    url: item.url,
  },
}));
```

## Best Practices

### 1. Document IDs

Use stable, meaningful IDs:

```typescript
// ✅ Good: Stable ID from source system
id: `article:${item.id}`;

// ✅ Good: Composite ID for uniqueness
id: `confluence:space-${spaceKey}:page-${pageId}`;

// ❌ Bad: Timestamp-based (changes each ingestion)
id: `document:${Date.now()}`;

// ❌ Bad: Array index (unstable)
id: `doc:${index}`;
```

### 2. Metadata Best Practices

Include useful metadata for filtering and context:

```typescript
metadata: {
  source: MODULE_ID,           // Required: Your ingestor ID
  id: `page:${item.id}`,       // Required: Unique document ID

  // Recommended
  title: item.title,           // Document title
  url: item.url,               // Link to original
  author: item.author,         // Content creator
  createdAt: item.createdAt,   // Creation date
  updatedAt: item.updatedAt,   // Last modified date

  // Optional but useful
  type: 'article',             // Resource type
  category: item.category,     // Classification
  tags: item.tags,             // Keywords
  permissions: item.access,    // Access control info
}
```

### 3. Content Formatting

Format content for optimal embedding:

```typescript
// ✅ Good: Structured, readable content
const content = `
${item.title}

${item.description}

${item.content}
`.trim();

// ✅ Good: Include context
const content = `
Document: ${item.title}
Source: ${item.source}
Last Updated: ${item.updatedAt}

${item.content}
`;

// ❌ Bad: Raw JSON
const content = JSON.stringify(item);

// ❌ Bad: Unstructured concatenation
const content = item.title + item.content + item.tags;
```

### 4. Logging

Provide comprehensive logging:

```typescript
logger.info('Starting custom ingestion');
logger.info(`Processing ${data.items.length} documents`);
logger.debug(`Fetching from ${apiUrl}`);
logger.warn(`Skipping invalid document: ${item.id}`);
logger.error('API request failed', error);
```

### 5. Configuration Validation

Validate configuration early:

```typescript
export const createCustomIngestor = async ({
  config,
  logger,
}): Promise<Ingestor> => {
  // Validate required config
  const apiUrl = config.getString('aiAssistant.ingestors.custom.apiUrl');
  if (!apiUrl) {
    throw new Error('API URL is required');
  }

  const apiKey = config.getString('aiAssistant.ingestors.custom.apiKey');
  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Test connection
  try {
    await fetch(apiUrl);
  } catch (error) {
    logger.error('Failed to connect to API', error);
    throw new Error('Invalid API URL or connection failed');
  }

  // ... rest of implementation
};
```

### 6. Performance

Optimize for large datasets:

```typescript
// Process in batches
const BATCH_SIZE = 50;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  const documents = batch.map(transformItem);
  await saveDocumentsBatch(documents);
}

// Use parallel processing when safe
const documents = await Promise.all(
  items.map(async item => ({
    content: await fetchContent(item.id),
    metadata: { source: MODULE_ID, id: `doc:${item.id}` },
  })),
);
```

## Testing

### Unit Tests

Create `src/services/ingestor.test.ts`:

```typescript
import { createCustomIngestor } from './ingestor';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';

describe('createCustomIngestor', () => {
  let mockConfig: jest.Mocked<RootConfigService>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    mockConfig = {
      getString: jest.fn(),
      getOptionalStringArray: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;
  });

  it('should create an ingestor with correct ID', async () => {
    mockConfig.getString.mockReturnValue('http://api.example.com');

    const ingestor = await createCustomIngestor({
      config: mockConfig,
      logger: mockLogger,
    });

    expect(ingestor.id).toBe('custom');
  });

  it('should fetch and transform documents', async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: 1, title: 'Test', content: 'Content' }],
      }),
    });

    mockConfig.getString.mockReturnValue('http://api.example.com');

    const ingestor = await createCustomIngestor({
      config: mockConfig,
      logger: mockLogger,
    });

    const mockSaveDocumentsBatch = jest.fn();
    await ingestor.ingest({ saveDocumentsBatch: mockSaveDocumentsBatch });

    expect(mockSaveDocumentsBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Test'),
          metadata: expect.objectContaining({
            source: 'custom',
            id: 'document:1',
          }),
        }),
      ]),
    );
  });
});
```

## Examples

See the following reference implementations:

- **[Catalog Ingestor](../plugins/ai-assistant-backend-module-ingestor-catalog)** - Simple REST API integration
- **[GitHub Ingestor](../plugins/ai-assistant-backend-module-ingestor-github)** - File-based ingestion with GitHub API
- **[Azure DevOps Ingestor](../plugins/ai-assistant-backend-module-ingestor-azure-devops)** - Multi-resource type ingestion

---

**Next Steps:**

- [Create custom tools](./custom-tools.md)
- [Configure your ingestor](./configuration.md)
- [Review architecture](./architecture.md)
