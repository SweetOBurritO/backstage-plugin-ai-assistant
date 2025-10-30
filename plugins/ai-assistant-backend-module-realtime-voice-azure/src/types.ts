/**
 * Types for Azure OpenAI Realtime API
 */

export interface RealtimeSessionRequest {
  model: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  instructions?: string;
  input_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  output_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  tools?: Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  temperature?: number;
  max_response_output_tokens?: number | 'inf';
}

export interface RealtimeSessionResponse {
  id: string;
  model: string;
  expires_at: number;
  client_secret: {
    value: string;
    expires_at: number;
  };
}

export interface RealtimeSessionConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  apiVersion?: string;
}

