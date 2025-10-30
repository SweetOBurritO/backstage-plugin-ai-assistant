# Real-time Voice Conversion with Azure OpenAI

This guide explains how to set up and use real-time voice conversion (speech-in, speech-out) in the Backstage AI Assistant plugin using Azure OpenAI's Realtime API with WebRTC.

## Overview

The real-time voice feature provides:

- **Speech-to-Speech Conversion**: Talk naturally to the AI assistant and hear responses in real-time
- **WebRTC-Based**: Low-latency audio streaming directly in the browser
- **Secure Authentication**: Ephemeral keys generated server-side for secure connections
- **Multiple Voices**: Choose from different voice options (alloy, echo, shimmer)
- **Automatic Transcription**: See a transcript of your conversation as you talk

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Backstage Frontend)                                    │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ RealtimeVoiceChat Component                              │    │
│ │ - getUserMedia() → Microphone                            │    │
│ │ - WebRTC PeerConnection → Bidirectional Audio            │    │
│ │ - Data Channel → Protocol Messages & Transcripts         │    │
│ └──────────────────────────┬──────────────────────────────┘    │
└────────────────────────────┼────────────────────────────────────┘
                             │ 1. POST /api/ai-assistant/realtime/session
                             │    Request ephemeral credentials
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backstage Backend                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ Realtime Voice Module                                    │    │
│ │ - Stores long-lived Azure OpenAI API key                │    │
│ │ - Generates ephemeral session credentials (~1 min)      │    │
│ │ - Returns webrtcUrl + ephemeralKey                       │    │
│ └──────────────────────────┬──────────────────────────────┘    │
└────────────────────────────┼────────────────────────────────────┘
                             │ 2. POST /openai/realtime/sessions
                             │    Create session with long-lived key
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ Azure OpenAI Realtime API                                        │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ gpt-4o-realtime-preview Model                            │    │
│ │ - WebRTC Connection (authenticated via ephemeral key)   │    │
│ │ - Real-time speech processing                            │    │
│ │ - Bidirectional audio streaming                          │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Azure OpenAI Resource

You need an Azure OpenAI resource with access to the Realtime API:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create or use an existing Azure OpenAI resource
3. Deploy a `gpt-4o-realtime-preview` model
4. Note down:
   - Endpoint URL (e.g., `https://your-resource.openai.azure.com`)
   - API Key
   - Deployment name

### 2. Browser Requirements

- Modern browser with WebRTC support (Chrome, Edge, Firefox, Safari)
- Microphone permission
- HTTPS connection (required for getUserMedia)

## Installation

### Backend Module

1. Install the backend module:

```bash
cd packages/backend
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure
```

2. Register the module in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins ...

// Add the AI Assistant backend plugin
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Add the Realtime Voice module
backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure')
);

backend.start();
```

### Frontend Component

The frontend component is already included in the main `@sweetoburrito/backstage-plugin-ai-assistant` package.

To use it in your app, you can either:

#### Option 1: Add to Existing AI Assistant Page

Modify your AI Assistant page to include the voice chat component:

```typescript
import React from 'react';
import { RealtimeVoiceChat } from '@sweetoburrito/backstage-plugin-ai-assistant';
import { Content, Page, Header } from '@backstage/core-components';
import { Grid } from '@material-ui/core';

export const AiAssistantPage = () => (
  <Page themeId="tool">
    <Header title="AI Assistant" />
    <Content>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {/* Your existing chat component */}
        </Grid>
        <Grid item xs={12} md={6}>
          <RealtimeVoiceChat />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
```

#### Option 2: Create Standalone Route

Add a dedicated route in `packages/app/src/App.tsx`:

```typescript
import { RealtimeVoiceChat } from '@sweetoburrito/backstage-plugin-ai-assistant';

// In your routes:
<Route path="/voice-assistant" element={<RealtimeVoiceChat />} />
```

## Configuration

Add the following to your `app-config.yaml`:

```yaml
aiAssistant:
  # ... other config ...
  
  realtimeVoice:
    azureOpenAi:
      # Your Azure OpenAI API key (store securely, e.g., environment variable)
      apiKey: ${AZURE_OPENAI_REALTIME_API_KEY}
      
      # Your Azure OpenAI endpoint
      endpoint: https://your-resource.openai.azure.com
      
      # Deployment name for gpt-4o-realtime-preview model
      deploymentName: gpt-4o-realtime-preview
      
      # Optional: API version (defaults to 2024-10-01-preview)
      apiVersion: 2024-10-01-preview
```

For production, use environment variables:

```bash
export AZURE_OPENAI_REALTIME_API_KEY="your-api-key-here"
```

## Usage

### Starting a Voice Session

1. Navigate to the AI Assistant Voice page
2. Select a voice from the dropdown (Alloy, Echo, or Shimmer)
3. Click the "Start" button
4. Grant microphone permission when prompted
5. Wait for the connection to establish (status will show "Connected")

### During a Session

- **Speak naturally**: The AI will detect when you start and stop speaking
- **View transcript**: Your conversation will appear in real-time below the controls
- **Mute microphone**: Click the microphone icon to temporarily mute your mic
- **Mute assistant**: Click the speaker icon to mute the assistant's audio
- **Stop session**: Click the red "Stop" button to end the session

### Status Indicators

- **Disconnected**: Not connected to the service
- **Connecting...**: Establishing connection
- **Connected**: Ready to use
- **Listening...**: Detecting your speech
- **Processing...**: AI is processing your input
- **Speaking...**: AI is responding

## API Reference

### Backend Endpoint

**POST** `/api/ai-assistant/realtime/session`

Create a new realtime session and get ephemeral credentials.

**Request Body** (optional):
```json
{
  "voice": "alloy",
  "instructions": "Custom system instructions",
  "temperature": 0.7
}
```

**Response**:
```json
{
  "sessionId": "session_abc123",
  "webrtcUrl": "https://your-resource.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-4o-realtime-preview",
  "ephemeralKey": "eph_key_xyz...",
  "expiresAt": 1234567890,
  "model": "gpt-4o-realtime-preview"
}
```

### Frontend API

```typescript
import { useApi } from '@backstage/core-plugin-api';
import { realtimeVoiceApiRef } from '@sweetoburrito/backstage-plugin-ai-assistant';

const VoiceComponent = () => {
  const api = useApi(realtimeVoiceApiRef);
  
  const startSession = async () => {
    const session = await api.createSession({
      voice: 'alloy',
      temperature: 0.7,
    });
    // Use session.webrtcUrl and session.ephemeralKey for WebRTC
  };
};
```

## Customization

### Voice Instructions

You can customize the AI assistant's behavior by modifying the instructions in the backend service:

```typescript
// In your backend setup
const sessionInfo = await api.createSession({
  instructions: 'You are a DevOps expert specializing in Kubernetes. Provide technical, concise answers.',
  voice: 'echo',
  temperature: 0.5,
});
```

### Audio Settings

The default audio settings use:
- **Format**: PCM16 (16-bit PCM)
- **Echo Cancellation**: Enabled
- **Noise Suppression**: Enabled
- **Auto Gain Control**: Enabled

These are configured in the component's `getUserMedia` call.

### Turn Detection

Server-side Voice Activity Detection (VAD) is enabled by default with:
- **Threshold**: 0.5
- **Prefix Padding**: 300ms
- **Silence Duration**: 500ms

## Security Considerations

### Key Management

- **Long-lived API keys** are stored server-side only (never sent to browser)
- **Ephemeral keys** are generated per session with ~1 minute expiration
- Use environment variables for API keys in production
- Consider using Azure Key Vault for key storage

### HTTPS Requirement

- WebRTC requires HTTPS in production
- `getUserMedia()` only works on `localhost` (HTTP) or HTTPS domains
- Configure proper SSL certificates for your Backstage instance

### CORS Configuration

Ensure your backend CORS settings allow the frontend origin:

```yaml
backend:
  cors:
    origin: https://your-backstage-domain.com
    credentials: true
```

## Troubleshooting

### "Failed to start session"

- Check that your Azure OpenAI endpoint and API key are correct
- Verify the deployment name matches your realtime-capable deployment
- Check backend logs for detailed error messages

### "Microphone permission denied"

- Grant microphone permission in your browser
- On macOS, check System Preferences → Security & Privacy → Microphone
- Ensure you're using HTTPS (or localhost for development)

### "Connection timeout"

- Check your network connection
- Verify firewall settings allow WebRTC traffic
- Azure OpenAI Realtime API may have regional availability limitations

### "No audio from assistant"

- Check that your speakers/headphones are working
- Look for the mute icon and ensure assistant audio is not muted
- Check browser audio settings and ensure the site isn't muted

### Backend Logs

Enable debug logging to troubleshoot:

```yaml
backend:
  log:
    level: debug
```

## Limitations

- Session duration is limited by Azure OpenAI (~15 minutes typical)
- Ephemeral keys expire after ~1 minute
- WebRTC requires modern browser support
- Real-time API is currently in preview and may have usage limits

## Additional Resources

- [Azure OpenAI Realtime API Documentation](https://learn.microsoft.com/azure/ai-services/openai/realtime-audio-quickstart)
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Backstage Plugin Development](https://backstage.io/docs/plugins/)

## Support

For issues and questions:
- GitHub Issues: [backstage-plugin-ai-assistant](https://github.com/sweetoburrito/backstage-plugin-ai-assistant)
- Azure OpenAI Support: [Azure Portal](https://portal.azure.com)

