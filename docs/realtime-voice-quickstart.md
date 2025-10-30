# Quick Start: Real-time Voice Assistant

Get your real-time voice assistant running in 5 minutes!

## 1. Prerequisites

- Azure OpenAI resource with `gpt-4o-realtime-preview` deployment
- Microphone-enabled browser (Chrome, Edge, Firefox, Safari)
- HTTPS connection (or localhost for development)

## 2. Install the Backend Module

```bash
cd packages/backend
yarn add @sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure
```

## 3. Register the Module

Edit `packages/backend/src/index.ts`:

```typescript
const backend = createBackend();

// Add these lines
backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));
backend.add(
  import('@sweetoburrito/backstage-plugin-ai-assistant-backend-module-realtime-voice-azure')
);

backend.start();
```

## 4. Configure Azure OpenAI

Add to `app-config.yaml`:

```yaml
aiAssistant:
  realtimeVoice:
    azureOpenAi:
      apiKey: ${AZURE_OPENAI_REALTIME_API_KEY}
      endpoint: https://your-resource.openai.azure.com
      deploymentName: gpt-4o-realtime-preview
```

Set your environment variable:

```bash
export AZURE_OPENAI_REALTIME_API_KEY="your-api-key-here"
```

## 5. Add Voice Chat to Your App

### Option A: Standalone Page

Edit `packages/app/src/App.tsx`:

```typescript
import { RealtimeVoiceChat } from '@sweetoburrito/backstage-plugin-ai-assistant';

// Add to your routes:
<Route path="/voice-assistant" element={<RealtimeVoiceChat />} />
```

### Option B: Add to Existing Page

```typescript
import { RealtimeVoiceChat } from '@sweetoburrito/backstage-plugin-ai-assistant';

export const MyPage = () => (
  <Page>
    <Content>
      <RealtimeVoiceChat />
    </Content>
  </Page>
);
```

## 6. Install Dependencies

```bash
# Install frontend dependencies
yarn install

# Or if you added new packages
yarn workspace @internal/plugin-ai-assistant add @mui/styles
```

## 7. Start Backstage

```bash
# Terminal 1: Start backend
yarn workspace backend start

# Terminal 2: Start frontend  
yarn workspace app start
```

## 8. Test the Voice Assistant

1. Navigate to `http://localhost:3000/voice-assistant`
2. Select a voice (Alloy, Echo, or Shimmer)
3. Click "Start"
4. Grant microphone permission
5. Start talking!

## Troubleshooting

### Backend not starting?
- Check that your Azure OpenAI credentials are correct
- Verify the deployment name matches your realtime deployment
- Check logs: `yarn workspace backend start --log-level=debug`

### Frontend errors?
- Run `yarn install` to ensure all dependencies are installed
- Clear browser cache and reload
- Check browser console for errors

### No audio?
- Ensure microphone permission is granted
- Check that you're using HTTPS (or localhost)
- Verify speakers/headphones are working
- Check browser audio settings

## Next Steps

- [Full Documentation](./realtime-voice.md)
- [API Reference](./realtime-voice.md#api-reference)
- [Customization Guide](./realtime-voice.md#customization)

## Need Help?

- Check the [Troubleshooting Guide](./realtime-voice.md#troubleshooting)
- Review [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/realtime-audio-quickstart)
- Open an issue on GitHub

---

**Estimated Setup Time**: 5-10 minutes  
**Difficulty**: Beginner

