# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure

Backend module for real-time voice conversion using Azure OpenAI Realtime API (WebRTC).

## Overview

This module provides real-time speech-to-speech voice conversion capabilities for the Backstage AI Assistant plugin using Azure OpenAI's Realtime API with WebRTC. It enables:

- Real-time voice conversations (speech-in, speech-out) directly in the browser
- WebRTC-based audio streaming with low latency
- Server-side ephemeral key generation for secure client connections
- Support for multiple voice options (alloy, echo, shimmer)

## Installation

```bash
yarn add --cwd packages/backend @sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure
```

## Configuration

Add the following configuration to your `app-config.yaml`:

```yaml
aiAssistant:
  realtimeVoice:
    azureOpenAi:
      # Your Azure OpenAI API key (kept server-side only)
      apiKey: ${AZURE_OPENAI_API_KEY}
      
      # Your Azure OpenAI endpoint
      endpoint: https://YOUR_RESOURCE.openai.azure.com
      
      # Deployment name for gpt-4o-realtime-preview model
      deploymentName: gpt-4o-realtime-preview
      
      # Optional: API version (defaults to 2024-10-01-preview)
      apiVersion: 2024-10-01-preview
```

## Usage

### Backend Setup

In your `packages/backend/src/index.ts`, add the module:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins ...

backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure')
);

backend.start();
```

### API Endpoint

The module exposes the following endpoints:

#### POST `/api/ai-assistant/realtime/session`

Creates a new realtime session and returns ephemeral credentials.

**Request body (optional):**
```json
{
  "voice": "alloy",
  "instructions": "Custom system instructions",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "webrtcUrl": "https://your-resource.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-4o-realtime-preview",
  "ephemeralKey": "eph_key_xyz...",
  "expiresAt": 1234567890,
  "model": "gpt-4o-realtime-preview"
}
```

## Architecture

```
Browser (Frontend)
  ├─ getUserMedia (mic) → WebRTC PeerConnection
  ├─ Plays remote audio from model
  └─ Data channel → send session/update events
        ↓
        Authorization: Bearer <ephemeral key> (valid ~1 min)
        ↓
Backend Module (Express)
  └─ POST /realtime/session → Azure "/realtime/sessions"
      - Uses long-lived AOAI key (server-side only)
      - Returns { webrtcUrl, ephemeral key }
        ↓
Azure OpenAI Realtime API (WebRTC)
  └─ gpt-4o-*-realtime model streams speech in/out
```

## Security

- Long-lived Azure OpenAI API keys are kept server-side only
- Ephemeral keys are generated per session with ~1 minute expiration
- WebRTC connections are authenticated using ephemeral keys
- No sensitive credentials are exposed to the client

## License

Apache-2.0

