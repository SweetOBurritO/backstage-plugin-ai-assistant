import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';

/**
 * API for interacting with Azure OpenAI Realtime voice service
 */
export interface RealtimeVoiceApi {
  /**
   * Create a new realtime session
   */
  createSession(config?: {
    voice?: 'alloy' | 'echo' | 'shimmer';
    instructions?: string;
    temperature?: number;
  }): Promise<RealtimeSessionInfo>;

  /**
   * Get available tool schemas
   */
  getToolSchemas(): Promise<ToolSchema[]>;

  /**
   * Execute a tool by name with provided arguments
   */
  executeTool(name: string, args: any): Promise<{ output: string }>;

  /**
   * Get current user information
   */
  getCurrentUser(): Promise<UserInfo>;
}

export interface RealtimeSessionInfo {
  sessionId: string;
  webrtcUrl: string;
  ephemeralKey: string;
  expiresAt: number;
  model: string;
}

export interface ToolSchema {
  type: 'function';
  name: string;
  description: string;
  parameters: any;
}

export interface UserInfo {
  userEntityRef: string;
  displayName: string;
  email: string;
}

export const realtimeVoiceApiRef = createApiRef<RealtimeVoiceApi>({
  id: 'plugin.ai-assistant.realtime-voice',
});

export class RealtimeVoiceClient implements RealtimeVoiceApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async createSession(config?: {
    voice?: 'alloy' | 'echo' | 'shimmer';
    instructions?: string;
    temperature?: number;
  }): Promise<RealtimeSessionInfo> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-assistant');
    const response = await this.fetchApi.fetch(`${baseUrl}/realtime/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config || {}),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create realtime session: ${error}`);
    }

    return await response.json();
  }

  async getToolSchemas(): Promise<ToolSchema[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-assistant');
    const response = await this.fetchApi.fetch(`${baseUrl}/realtime/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch tool schemas: ${error}`);
    }

    const data = await response.json();
    return data.tools || [];
  }

  async executeTool(name: string, args: any): Promise<{ output: string }> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-assistant');
    const response = await this.fetchApi.fetch(
      `${baseUrl}/realtime/tools/exec`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, arguments: args }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute tool ${name}: ${error}`);
    }

    return await response.json();
  }

  async getCurrentUser(): Promise<UserInfo> {
    const baseUrl = await this.discoveryApi.getBaseUrl('ai-assistant');
    const response = await this.fetchApi.fetch(`${baseUrl}/realtime/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch current user: ${error}`);
    }

    return await response.json();
  }
}
