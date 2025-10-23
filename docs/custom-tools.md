# Custom Tool Development Guide

This guide walks you through creating custom tools (also called functions) that extend the AI assistant's capabilities. Tools enable the AI to perform actions, fetch dynamic data, or interact with external systems.

## Table of Contents

- [Overview](#overview)
- [Tool Interface](#tool-interface)
- [Creating a Basic Tool](#creating-a-basic-tool)
- [Registering Tools](#registering-tools)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Examples](#examples)

## Overview

### What is a Tool?

A tool is a function that the AI can call during conversation to:

- Fetch real-time data (weather, stock prices, etc.)
- Search internal systems (databases, APIs)
- Perform actions (create tickets, send emails, etc.)
- Execute computations (math, data analysis)
- Access external services (REST APIs, GraphQL)

### When to Create a Custom Tool

Create a custom tool when the AI needs to:

- Access data not available in the knowledge base
- Perform dynamic operations based on user input
- Interact with external services or APIs
- Execute specific business logic
- Provide real-time information

### How Tools Work

```
User: "What's the weather in Seattle?"
   │
   ├─→ AI decides to use 'getWeather' tool
   │
   ├─→ Tool executes: getWeather({ city: "Seattle" })
   │
   ├─→ Tool returns: "Sunny, 72°F"
   │
   └─→ AI responds: "The weather in Seattle is sunny with a temperature of 72°F."
```

## Tool Interface

### Core Types

```typescript
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { z, ZodType } from 'zod';

type Tool<T extends ZodType = ZodType> = {
  name: string; // Tool identifier (camelCase)
  description: string; // What the tool does (for AI)
  schema: T; // Zod schema for parameters
  func: (params: z.infer<T>) => Promise<string>; // Implementation
};
```

### Key Concepts

**Name**: Unique identifier for the tool

- Use camelCase (e.g., `getWeather`, `searchDocuments`)
- Should be descriptive and action-oriented
- Maximum ~20 characters recommended

**Description**: Explains when and how to use the tool

- Written for the AI model, not humans
- Include use cases and examples
- Specify what NOT to use the tool for
- Be clear and specific

**Schema**: Zod schema defining parameters

- Type-safe parameter definition
- Includes parameter descriptions
- Supports validation and defaults
- Generates JSON schema for AI

**Function**: Async implementation

- Receives validated parameters
- Must return a string
- Should handle errors gracefully
- Can call external services

## Creating a Basic Tool

### Step 1: Define the Tool

Create `src/services/tools/myTool.ts`:

```typescript
import {
  createAssistantTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { z } from 'zod';

export const createMyTool = (): Tool => {
  return createAssistantTool({
    tool: {
      name: 'myTool',

      description: `
        Brief description of what this tool does.
        
        Use this tool when:
        - User asks about X
        - Need to fetch Y
        
        Do NOT use when:
        - Information is already in context
        - Question is about general knowledge
      `,

      schema: z.object({
        param1: z.string().describe('Description of param1'),
        param2: z.number().optional().describe('Optional param2'),
      }),

      func: async ({ param1, param2 }) => {
        // Implementation
        return `Result for ${param1}`;
      },
    },
  });
};
```

### Step 2: Register the Tool

Register in the core plugin or a module. For core plugin, edit `plugins/ai-assistant-backend/src/plugin.ts`:

```typescript
import { createMyTool } from './services/tools/myTool';

// In plugin initialization
env.registerInit({
  deps: {
    /* ... */
  },
  async init(options) {
    // ... existing code ...

    // Register tool
    const myTool = createMyTool();
    tools.push(myTool);

    // ... rest of init ...
  },
});
```

### Step 3: Test the Tool

The tool is now available to the AI assistant. Test by:

1. Start the backend: `yarn start`
2. Ask a question that would trigger the tool
3. Check logs for tool execution

## Registering Tools

### Method 1: Via Core Plugin

Register directly in the core plugin (for built-in tools):

```typescript
// plugins/ai-assistant-backend/src/plugin.ts
import { createMyTool } from './services/tools/myTool';

env.registerInit({
  async init(options) {
    const myTool = createMyTool(options);
    tools.push(myTool);
  },
});
```

### Method 2: Via Backend Module

Create a separate module for external tools:

```typescript
// plugins/ai-assistant-backend-module-tool-custom/src/module.ts
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { toolExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createMyTool } from './tools/myTool';

export const aiAssistantModuleToolCustom = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'tool-custom',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        tools: toolExtensionPoint,
      },
      async init({ logger, config, tools }) {
        const myTool = createMyTool({ logger, config });
        tools.register(myTool);
      },
    });
  },
});
```

## Advanced Patterns

### Tool with External API

Fetch data from external services:

```typescript
import {
  createAssistantTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { z } from 'zod';

type CreateWeatherToolOptions = {
  apiKey: string;
  apiUrl: string;
};

export const createWeatherTool = ({
  apiKey,
  apiUrl,
}: CreateWeatherToolOptions): Tool => {
  return createAssistantTool({
    tool: {
      name: 'getWeather',

      description: `
        Get current weather information for a specific city.
        
        Use this tool when users ask about:
        - Current weather conditions
        - Temperature in a location
        - Weather forecasts
        
        Example queries:
        - "What's the weather in Seattle?"
        - "Is it raining in London?"
        - "Temperature in Tokyo"
      `,

      schema: z.object({
        city: z.string().describe('The city name to get weather for'),
        units: z
          .enum(['celsius', 'fahrenheit'])
          .optional()
          .default('fahrenheit')
          .describe('Temperature units'),
      }),

      func: async ({ city, units }) => {
        try {
          const response = await fetch(
            `${apiUrl}/weather?city=${encodeURIComponent(city)}&units=${units}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            },
          );

          if (!response.ok) {
            return `Unable to fetch weather for ${city}. Service unavailable.`;
          }

          const data = await response.json();

          return `Weather in ${city}: ${data.condition}, ${data.temperature}°${
            units === 'celsius' ? 'C' : 'F'
          }, humidity ${data.humidity}%`;
        } catch (error) {
          return `Error fetching weather data: ${error.message}`;
        }
      },
    },
  });
};
```

### Tool with Backstage Integration

Access Backstage services:

```typescript
import {
  createAssistantTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { CatalogApi } from '@backstage/catalog-client';
import { z } from 'zod';

type CreateCatalogSearchToolOptions = {
  catalogApi: CatalogApi;
};

export const createCatalogSearchTool = ({
  catalogApi,
}: CreateCatalogSearchToolOptions): Tool => {
  return createAssistantTool({
    tool: {
      name: 'searchCatalog',

      description: `
        Search the Backstage catalog for entities (components, APIs, resources).
        
        Use this tool when users ask about:
        - Specific services or components
        - APIs available in the organization
        - Resources and their owners
        - Entity relationships
        
        Do NOT use for general documentation searches.
      `,

      schema: z.object({
        query: z.string().describe('Search query for catalog entities'),
        kind: z
          .enum(['Component', 'API', 'Resource', 'System', 'Domain'])
          .optional()
          .describe('Filter by entity kind'),
        limit: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Maximum number of results'),
      }),

      func: async ({ query, kind, limit }) => {
        const filter: any = {
          'metadata.name': query,
        };

        if (kind) {
          filter.kind = kind;
        }

        const { items } = await catalogApi.getEntities({
          filter,
          limit,
        });

        if (items.length === 0) {
          return `No entities found matching "${query}"`;
        }

        const results = items
          .map(entity => {
            const name = entity.metadata.name;
            const kind = entity.kind;
            const description = entity.metadata.description || 'No description';
            const owner = entity.spec?.owner || 'Unknown';

            return `${kind}: ${name} - ${description} (Owner: ${owner})`;
          })
          .join('\n');

        return `Found ${items.length} entities:\n${results}`;
      },
    },
  });
};
```

### Tool with Database Access

Query databases for dynamic data:

```typescript
import {
  createAssistantTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { Knex } from 'knex';
import { z } from 'zod';

type CreateDatabaseToolOptions = {
  database: Knex;
};

export const createDatabaseQueryTool = ({
  database,
}: CreateDatabaseToolOptions): Tool => {
  return createAssistantTool({
    tool: {
      name: 'queryDatabase',

      description: `
        Query the internal database for specific records.
        
        Use this tool when users ask about:
        - Specific records or data points
        - Statistics or counts
        - Recent activity
        
        IMPORTANT: Only use for predefined safe queries.
      `,

      schema: z.object({
        queryType: z
          .enum(['user_count', 'recent_activity', 'entity_stats'])
          .describe('Type of query to execute'),
        filter: z.string().optional().describe('Optional filter parameter'),
      }),

      func: async ({ queryType, filter }) => {
        try {
          let result;

          switch (queryType) {
            case 'user_count':
              const count = await database('users').count('* as count').first();
              result = `Total users: ${count.count}`;
              break;

            case 'recent_activity':
              const limit = filter ? parseInt(filter) : 10;
              const activities = await database('activity')
                .orderBy('timestamp', 'desc')
                .limit(limit);
              result = activities
                .map(a => `${a.user} ${a.action} at ${a.timestamp}`)
                .join('\n');
              break;

            case 'entity_stats':
              const stats = await database('entities')
                .select('kind')
                .count('* as count')
                .groupBy('kind');
              result = stats.map(s => `${s.kind}: ${s.count}`).join('\n');
              break;

            default:
              result = 'Unknown query type';
          }

          return result;
        } catch (error) {
          return `Database query failed: ${error.message}`;
        }
      },
    },
  });
};
```

### Tool with Complex Parameters

Handle nested or complex parameter structures:

```typescript
export const createComplexTool = (): Tool => {
  return createAssistantTool({
    tool: {
      name: 'createTicket',

      description: `
        Create a support ticket in the ticketing system.
        
        Use when users explicitly request to create a ticket.
      `,

      schema: z.object({
        title: z.string().describe('Ticket title'),
        description: z.string().describe('Detailed description'),
        priority: z
          .enum(['low', 'medium', 'high', 'critical'])
          .default('medium')
          .describe('Ticket priority'),
        assignee: z.string().optional().describe('Assignee username'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags for categorization'),
        metadata: z
          .object({
            component: z.string().optional(),
            version: z.string().optional(),
          })
          .optional()
          .describe('Additional metadata'),
      }),

      func: async ({
        title,
        description,
        priority,
        assignee,
        tags,
        metadata,
      }) => {
        // Create ticket via API
        const ticket = await createTicketAPI({
          title,
          description,
          priority,
          assignee,
          tags,
          ...metadata,
        });

        return `Created ticket #${ticket.id}: ${title} (Priority: ${priority})`;
      },
    },
  });
};
```

### Tool with Validation

Add custom validation logic:

```typescript
export const createValidatingTool = (): Tool => {
  return createAssistantTool({
    tool: {
      name: 'sendEmail',

      description: 'Send an email to a user',

      schema: z.object({
        recipient: z.string().email().describe('Recipient email address'),
        subject: z.string().min(1).max(100).describe('Email subject'),
        body: z.string().min(10).describe('Email body (minimum 10 characters)'),
      }),

      func: async ({ recipient, subject, body }) => {
        // Additional validation
        if (!recipient.endsWith('@company.com')) {
          return 'Error: Can only send emails to company addresses';
        }

        if (body.toLowerCase().includes('confidential')) {
          return 'Error: Cannot send confidential information via this tool';
        }

        try {
          await sendEmailAPI({ recipient, subject, body });
          return `Email sent successfully to ${recipient}`;
        } catch (error) {
          return `Failed to send email: ${error.message}`;
        }
      },
    },
  });
};
```

### Tool with Caching

Cache results for performance:

```typescript
import { CacheService } from '@backstage/backend-plugin-api';

type CreateCachedToolOptions = {
  cache: CacheService;
};

export const createCachedTool = ({ cache }: CreateCachedToolOptions): Tool => {
  return createAssistantTool({
    tool: {
      name: 'getExchangeRate',

      description: 'Get currency exchange rates',

      schema: z.object({
        from: z.string().length(3).describe('Source currency code (e.g., USD)'),
        to: z.string().length(3).describe('Target currency code (e.g., EUR)'),
      }),

      func: async ({ from, to }) => {
        const cacheKey = `exchange_rate:${from}:${to}`;

        // Check cache
        const cached = await cache.get(cacheKey);
        if (cached) {
          return `Exchange rate ${from} to ${to}: ${cached} (cached)`;
        }

        // Fetch fresh data
        const rate = await fetchExchangeRate(from, to);

        // Cache for 1 hour
        await cache.set(cacheKey, rate, { ttl: 3600000 });

        return `Exchange rate ${from} to ${to}: ${rate}`;
      },
    },
  });
};
```

## Best Practices

### 1. Tool Naming

Choose clear, action-oriented names:

```typescript
// ✅ Good: Clear action verbs
name: 'getWeather';
name: 'searchDocuments';
name: 'createTicket';
name: 'calculateTax';

// ❌ Bad: Vague or noun-based
name: 'weather';
name: 'documents';
name: 'ticket';
name: 'tax';
```

### 2. Description Writing

Write descriptions for AI models:

```typescript
// ✅ Good: Clear, specific, with examples
description: `
  Get current weather information for a city.
  
  Use this tool when users ask about:
  - Current weather conditions
  - Temperature in a location
  - Weather forecasts
  
  Do NOT use when:
  - Historical weather data is requested
  - Question is about climate (use general knowledge)
  
  Examples:
  - "What's the weather in Seattle?"
  - "Is it raining in London?"
`;

// ❌ Bad: Vague or human-centric
description: 'This tool gets the weather';
```

### 3. Parameter Design

Design intuitive, well-documented parameters:

```typescript
// ✅ Good: Clear types and descriptions
schema: z.object({
  city: z.string().describe('The city name (e.g., "Seattle", "London")'),
  units: z
    .enum(['celsius', 'fahrenheit'])
    .default('fahrenheit')
    .describe('Temperature units to use'),
  includeforecast: z.boolean().optional().describe('Include 3-day forecast'),
});

// ❌ Bad: Unclear or undocumented
schema: z.object({
  q: z.string(),
  u: z.string(),
  f: z.boolean(),
});
```

### 4. Error Handling

Handle errors gracefully and informatively:

```typescript
func: async ({ param }) => {
  try {
    const result = await externalAPI(param);
    return formatResult(result);
  } catch (error) {
    // Log for debugging
    logger.error('Tool execution failed', error);

    // Return user-friendly message
    if (error.code === 'NOT_FOUND') {
      return `No results found for "${param}"`;
    }
    if (error.code === 'RATE_LIMIT') {
      return 'Rate limit exceeded. Please try again later.';
    }
    return 'An error occurred while processing your request.';
  }
};
```

### 5. Return Format

Return clear, structured text:

```typescript
// ✅ Good: Structured, readable
return `Weather in ${city}:
Temperature: ${data.temp}°F
Condition: ${data.condition}
Humidity: ${data.humidity}%
Wind: ${data.windSpeed} mph`;

// ✅ Good: List format
return `Found 3 components:
1. api-gateway - Main API gateway (Owner: platform-team)
2. user-service - User management service (Owner: identity-team)
3. payment-service - Payment processing (Owner: billing-team)`;

// ❌ Bad: Raw JSON
return JSON.stringify(data);

// ❌ Bad: Unstructured
return `${data.temp} ${data.condition} ${data.humidity}`;
```

### 6. Security

Implement security best practices:

```typescript
func: async ({ query }) => {
  // Validate input
  if (query.includes(';') || query.includes('--')) {
    return 'Invalid query: potential SQL injection detected';
  }

  // Use parameterized queries
  const results = await database.raw('SELECT * FROM data WHERE name = ?', [
    query,
  ]);

  // Sanitize output
  return sanitizeOutput(results);
};
```

### 7. Performance

Optimize for speed and resource usage:

```typescript
// Set reasonable limits
schema: z.object({
  limit: z.number().min(1).max(100).default(10),
}),

// Use pagination for large datasets
func: async ({ query, limit }) => {
  const results = await search(query, { limit });

  if (results.length === limit) {
    return `${formatResults(results)}\n\n(Showing first ${limit} results)`;
  }

  return formatResults(results);
}
```

## Testing

### Unit Tests

Create `src/services/tools/myTool.test.ts`:

```typescript
import { createMyTool } from './myTool';

describe('createMyTool', () => {
  it('should return correct tool structure', () => {
    const tool = createMyTool();

    expect(tool.name).toBe('myTool');
    expect(tool.description).toBeTruthy();
    expect(tool.schema).toBeDefined();
    expect(tool.func).toBeInstanceOf(Function);
  });

  it('should execute with valid parameters', async () => {
    const tool = createMyTool();

    const result = await tool.func({
      param1: 'test',
      param2: 42,
    });

    expect(result).toContain('test');
  });

  it('should handle errors gracefully', async () => {
    const tool = createMyTool();

    const result = await tool.func({
      param1: 'invalid',
    });

    expect(result).toContain('error');
  });
});
```

### Integration Tests

Test with the AI assistant:

```typescript
import { createChatService } from '../chat';
import { createMyTool } from './myTool';

describe('myTool integration', () => {
  it('should be callable by chat service', async () => {
    const tool = createMyTool();
    const chatService = await createChatService({
      tools: [tool],
      // ... other options
    });

    const response = await chatService.prompt({
      messages: [{ role: 'human', content: 'Use myTool with test data' }],
      modelId: 'test-model',
      conversationId: 'test',
      userEntityRef: 'user:default/test',
    });

    expect(response).toBeDefined();
  });
});
```

## Examples

### Example: Search Knowledge Base

The built-in search tool (see `searchKnowledge.ts`):

```typescript
export const createSearchKnowledgeTool = ({ vectorStore }): Tool => {
  return createAssistantTool({
    tool: {
      name: 'searchKnowledge',
      description: `Search the internal knowledge base.
      
Use when users ask about company-specific information.`,

      schema: z.object({
        query: z.string().describe('The search query'),
        filter: z
          .object({
            source: z.string().optional(),
            id: z.string().optional(),
          })
          .optional(),
        amount: z.number().min(1).optional(),
      }),

      func: async ({ query, filter, amount }) => {
        const results = await vectorStore.similaritySearch(
          query,
          filter,
          amount,
        );
        return results.map(r => r.content).join('\n---\n');
      },
    },
  });
};
```

---

**Next Steps:**

- [Review architecture](./architecture.md)
- [Configure tools](./configuration.md)
- [Create custom ingestors](./custom-ingestor.md)
