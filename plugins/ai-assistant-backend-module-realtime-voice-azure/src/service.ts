import fetch from 'node-fetch';
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  RealtimeSessionConfig,
  RealtimeSessionRequest,
  RealtimeSessionResponse,
} from './types';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { ZodType } from 'zod';
import zodToJsonSchema from '@alcyone-labs/zod-to-json-schema';

/**
 * Service to interact with Azure OpenAI Realtime API
 */
export class AzureRealtimeService {
  private readonly config: RealtimeSessionConfig;
  private readonly logger: LoggerService;
  private tools: Tool<ZodType>[] = [];

  constructor(config: RealtimeSessionConfig, logger: LoggerService) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the service with tools from the main plugin
   */
  initialize(options: { tools: Tool<ZodType>[] }): void {
    this.tools = options.tools;
    this.logger.info(
      `Realtime voice service initialized with ${this.tools.length} tools`,
    );
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool<ZodType> | undefined {
    return this.tools.find(t => t.name === name);
  }

  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(name: string, args: any): Promise<string> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      // Validate arguments against the schema
      const validatedArgs: any = await tool.schema.parseAsync(args ?? {});

      // Execute the tool - tools will have access to user context if needed
      const result = await tool.func(validatedArgs);

      return result;
    } catch (error) {
      this.logger.error('Tool execution failed', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Convert tools to OpenAI Realtime API format
   * Directly converts Zod schemas to JSON Schema without wrapping
   */
  getToolSchemas(): Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: any;
  }> {
    return this.tools.map(tool => {
      const jsonSchema = zodToJsonSchema(tool.schema, {
        target: 'openApi3',
        $refStrategy: 'none',
      });

      return {
        type: 'function' as const,
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema,
      };
    });
  }

  /**
   * Create a new realtime session and return ephemeral credentials
   */
  async createSession(
    request?: Partial<RealtimeSessionRequest>,
  ): Promise<RealtimeSessionResponse> {
    // Use the correct API version that matches the working example
    const apiVersion = this.config.apiVersion || '2025-04-01-preview';

    // Use the correct API path: /openai/realtimeapi/sessions (not /openai/deployments/...)
    const url = `${this.config.endpoint}/openai/realtimeapi/sessions?api-version=${apiVersion}`;

    // Simplified request body matching the working example
    const requestBody = {
      model: this.config.deploymentName,
      voice: request?.voice || 'alloy',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Failed to create realtime session', {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `Azure OpenAI Realtime API error: ${response.status} - ${errorText}`,
        );
      }

      const data = (await response.json()) as RealtimeSessionResponse;

      // Extract region from endpoint
      const region = this.extractRegion();

      // Return the response in a format that matches what the frontend expects
      // Include region information for WebRTC connection
      return {
        ...data,
        region,
      } as RealtimeSessionResponse & { region: string };
    } catch (error) {
      this.logger.error('Error creating realtime session', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the WebRTC endpoint URL for the session
   */
  getWebRtcUrl(): string {
    const apiVersion = this.config.apiVersion || '2025-04-01-preview';
    return `${this.config.endpoint}/openai/realtime?api-version=${apiVersion}&deployment=${this.config.deploymentName}`;
  }

  /**
   * Extract region from the Azure OpenAI endpoint URL
   */
  private extractRegion(): string {
    try {
      const endpointUrl = new URL(this.config.endpoint);
      const hostname = endpointUrl.hostname;

      // Extract region - looking for pattern like "ntxdev01devoaiwu301-eu2"
      // where "eu2" is the region (eastus2)
      let region = 'eastus2'; // default fallback

      const parts = hostname.split('.')[0].split('-');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        // Map common abbreviations to full region names
        const regionMap: Record<string, string> = {
          eu2: 'eastus2',
          eu: 'eastus',
          wu: 'westus',
          wu2: 'westus2',
          wu3: 'westus3',
          sc: 'swedencentral',
          nc: 'northcentralus',
          weu: 'westeurope',
          neu: 'northeurope',
        };
        region = regionMap[lastPart] || lastPart;
      }

      return region;
    } catch (error) {
      this.logger.warn(
        'Failed to extract region from endpoint, using default',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return 'eastus2';
    }
  }
}
