# Real-time Voice Conversion - Technical Flow

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  1. USER CLICKS "START" BUTTON                                         │
│     └─> RealtimeVoiceChat Component                                    │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  2. REQUEST EPHEMERAL SESSION                                          │
│     POST /api/ai-assistant/realtime/session                            │
│     Body: { voice: "alloy", temperature: 0.7 }                         │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  3. BACKEND MODULE PROCESSES REQUEST                                   │
│     ├─> Read config (long-lived API key)                               │
│     ├─> Call Azure OpenAI Realtime API                                 │
│     │   POST /openai/deployments/{deployment}/realtime/sessions        │
│     │   Header: api-key: <long-lived-key>                              │
│     │                                                                   │
│     └─> Receive ephemeral credentials                                  │
│         { sessionId, client_secret: { value, expires_at } }            │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  4. RETURN SESSION INFO TO FRONTEND                                    │
│     Response: {                                                        │
│       sessionId: "session_abc123",                                     │
│       webrtcUrl: "https://...openai.azure.com/openai/realtime?...",   │
│       ephemeralKey: "eph_key_xyz...",                                  │
│       expiresAt: 1234567890,                                           │
│       model: "gpt-4o-realtime-preview"                                 │
│     }                                                                  │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  5. GET USER MICROPHONE ACCESS                                         │
│     navigator.mediaDevices.getUserMedia({ audio: {...} })             │
│     └─> User grants permission                                         │
│         └─> Receive MediaStream with audio track                       │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  6. CREATE WEBRTC PEER CONNECTION                                      │
│     ├─> const pc = new RTCPeerConnection()                             │
│     ├─> Add microphone track: pc.addTrack(audioTrack)                  │
│     ├─> Create data channel: pc.createDataChannel('oai-events')       │
│     └─> Set up event handlers (ontrack, onicecandidate)               │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  7. CREATE AND SEND SDP OFFER                                          │
│     ├─> const offer = await pc.createOffer()                           │
│     ├─> await pc.setLocalDescription(offer)                            │
│     │                                                                   │
│     └─> POST to webrtcUrl                                              │
│         Headers: { Authorization: Bearer <ephemeralKey> }              │
│         Body: offer.sdp                                                │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  8. AZURE OPENAI RETURNS SDP ANSWER                                    │
│     Response: <SDP answer string>                                      │
│     └─> await pc.setRemoteDescription({ type: 'answer', sdp: ... })   │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  9. WEBRTC CONNECTION ESTABLISHED                                      │
│     ├─> Data channel opens                                             │
│     ├─> Audio starts streaming bidirectionally                         │
│     │   ├─> User mic → Azure OpenAI                                    │
│     │   └─> Azure OpenAI → User speakers                               │
│     │                                                                   │
│     └─> Send session configuration via data channel                    │
│         { type: 'session.update', session: {...} }                     │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  10. REAL-TIME CONVERSATION                                            │
│                                                                         │
│      User speaks                                                       │
│         └─> Microphone captures audio                                  │
│             └─> WebRTC sends to Azure                                  │
│                 └─> Azure detects speech (VAD)                         │
│                     └─> Azure processes with GPT-4o                    │
│                         └─> Azure generates response audio             │
│                             └─> WebRTC streams back                    │
│                                 └─> Browser plays audio                │
│                                                                         │
│      Data channel messages:                                            │
│      ├─> input_audio_buffer.speech_started                            │
│      ├─> input_audio_buffer.speech_stopped                            │
│      ├─> conversation.item.created                                     │
│      ├─> response.audio.delta (streaming)                              │
│      ├─> response.audio.done                                           │
│      └─> conversation.item.input_audio_transcription.completed        │
│                                                                         │
│      UI updates with transcripts in real-time                          │
│                                                                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  11. USER CLICKS "STOP" BUTTON                                         │
│      ├─> Close data channel                                            │
│      ├─> Close peer connection                                         │
│      ├─> Stop microphone tracks                                        │
│      └─> Clear audio element                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Flow

```
┌──────────────────────┐
│   Long-lived Key     │  Stored server-side only
│   (app-config.yaml)  │  Never sent to browser
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Backend Module      │  Uses long-lived key to create session
│  POST to Azure       │  Receives ephemeral credentials
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Ephemeral Key       │  Valid for ~1 minute
│  Sent to browser     │  Used to authenticate WebRTC
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  WebRTC Connection   │  Authenticated with ephemeral key
│  Browser ←→ Azure    │  Expires automatically
└──────────────────────┘
```

## Audio Processing Flow

```
User speaks → Mic captures → Browser encodes (PCM16)
                                      ↓
                            WebRTC PeerConnection
                                      ↓
                            Azure OpenAI Realtime API
                                      ↓
                         Server VAD detects speech
                                      ↓
                         GPT-4o processes conversation
                                      ↓
                         Generate response audio
                                      ↓
                            WebRTC PeerConnection
                                      ↓
                            Browser decodes audio
                                      ↓
                         Speakers play response
```

## Data Channel Messages

```
Frontend → Azure:
  - session.update            (configure session)
  - input_audio_buffer.append (manual audio append)
  - conversation.item.create  (create conversation item)

Azure → Frontend:
  - session.created
  - session.updated
  - input_audio_buffer.speech_started
  - input_audio_buffer.speech_stopped
  - conversation.item.created
  - conversation.item.input_audio_transcription.completed
  - response.created
  - response.audio.delta
  - response.audio.done
  - response.done
```

## Component State Machine

```
┌──────────────┐
│ Disconnected │ ◄─────────────────────┐
└──────┬───────┘                       │
       │ Click Start                   │
       ▼                               │
┌──────────────┐                       │
│ Connecting   │                       │
└──────┬───────┘                       │
       │ Session created               │
       │ WebRTC connected              │
       ▼                               │
┌──────────────┐                       │
│  Connected   │                       │
└──────┬───────┘                       │
       │ User speaks                   │
       ▼                               │
┌──────────────┐                       │
│  Listening   │                       │
└──────┬───────┘                       │
       │ Speech detected               │
       ▼                               │
┌──────────────┐                       │
│ Processing   │                       │
└──────┬───────┘                       │
       │ Response ready                │
       ▼                               │
┌──────────────┐                       │
│  Speaking    │                       │
└──────┬───────┘                       │
       │ Response complete             │
       ▼                               │
┌──────────────┐                       │
│  Connected   │ ◄─────────────────────┘
└──────┬───────┘ (back to listening)
       │ Click Stop
       ▼
┌──────────────┐
│ Disconnected │
└──────────────┘
```

## Error Handling Flow

```
┌─────────────────────┐
│  Try Operation      │
└──────┬──────────────┘
       │
       ├─ Success → Continue
       │
       └─ Error ↓
          │
          ├─ InputError → 400 response
          ├─ Network error → Retry logic
          ├─ Auth error → Clear session
          └─ Unknown → Log + notify user
                 │
                 ▼
          ┌──────────────┐
          │ Set error    │
          │ state in UI  │
          └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │ Cleanup      │
          │ resources    │
          └──────────────┘
```

## Performance Metrics

- **Latency**: 200-500ms typical (voice to response)
- **Session Creation**: 1-2 seconds
- **Ephemeral Key Expiry**: ~60 seconds
- **Session Duration**: ~15 minutes maximum
- **Audio Format**: PCM16 (16-bit linear PCM at 24kHz)
- **Bandwidth**: ~128 kbps bidirectional

## Browser Compatibility

✅ Chrome 90+
✅ Edge 90+
✅ Firefox 88+
✅ Safari 15.4+
❌ IE (not supported)

## API Rate Limits

- Session creation: Varies by Azure subscription
- WebRTC connections: Subject to Azure OpenAI quotas
- Data channel messages: No practical limit

