import { useState, useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import InterruptIcon from '@mui/icons-material/PanToolAlt';
import ChatIcon from '@mui/icons-material/Chat';
import { useApi } from '@backstage/core-plugin-api';
import { realtimeVoiceApiRef } from '../../api/realtimeVoice';

type SessionState = 'idle' | 'listening' | 'speaking' | 'waiting';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const RealtimeVoiceChat = () => {
  const api = useApi(realtimeVoiceApiRef);

  // State management
  const [state, setState] = useState<SessionState>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  // Refs for WebRTC components
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Tracking state
  const hasActiveResponseRef = useRef(false);
  const currentAssistantMessageRef = useRef('');
  const pendingCallsRef = useRef<
    Map<string, { name: string; argsText: string }>
  >(new Map());

  // Initialize audio element
  useEffect(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;
      document.body.appendChild(audioElementRef.current);
    }

    return () => {
      if (audioElementRef.current) {
        document.body.removeChild(audioElementRef.current);
        audioElementRef.current = null;
      }
    };
  }, []);

  const addChatMessage = useCallback(
    (role: 'user' | 'assistant', content: string) => {
      if (!content || content.trim() === '') return;

      setChatHistory(prev => [
        ...prev,
        { role, content: content.trim(), timestamp: new Date() },
      ]);
    },
    [],
  );

  const handleToolCall = useCallback(
    async (message: any) => {
      const { call_id, name } = message;

      // Get the accumulated arguments from pendingCalls
      const entry = pendingCallsRef.current.get(call_id);

      // Set name from message if we have it
      if (name && entry) {
        entry.name = name;
      }

      if (!entry) {
        return;
      }

      if (!entry.name) {
        return;
      }

      try {
        // Parse arguments from accumulated text
        let parsedArgs = {};
        try {
          parsedArgs = entry.argsText ? JSON.parse(entry.argsText) : {};
        } catch (e) {
          // Failed to parse JSON
        }

        // Execute the tool via the API
        const result = await api.executeTool(entry.name, parsedArgs);

        const outputText = result.output;

        // Send the result back to the session
        if (dataChannelRef.current?.readyState === 'open') {
          const outputMessage = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id,
              output: outputText,
            },
          };

          dataChannelRef.current.send(JSON.stringify(outputMessage));

          // Trigger a response
          dataChannelRef.current.send(
            JSON.stringify({
              type: 'response.create',
            }),
          );
        }

        // Cleanup
        pendingCallsRef.current.delete(call_id);
      } catch (err) {
        // Send error back to the session
        if (dataChannelRef.current?.readyState === 'open') {
          dataChannelRef.current.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id,
                output: JSON.stringify({
                  error:
                    err instanceof Error
                      ? err.message
                      : 'Tool execution failed',
                }),
              },
            }),
          );
        }
        // Cleanup even on error
        pendingCallsRef.current.delete(call_id);
      }
    },
    [api],
  );

  const cleanup = useCallback(() => {
    setState('idle');

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    hasActiveResponseRef.current = false;
    currentAssistantMessageRef.current = '';
  }, []);

  const handleDataChannelMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'session.created':
          case 'session.updated':
            setState('listening');
            break;

          case 'input_audio_buffer.speech_started':
            setState('listening');

            if (hasActiveResponseRef.current) {
              currentAssistantMessageRef.current = '';
            }

            if (
              hasActiveResponseRef.current &&
              dataChannelRef.current?.readyState === 'open'
            ) {
              dataChannelRef.current.send(
                JSON.stringify({ type: 'response.cancel' }),
              );
            }
            break;

          case 'input_audio_buffer.speech_stopped':
            setState('waiting');
            break;

          case 'conversation.item.input_audio_transcription.completed':
            if (message.transcript) {
              addChatMessage('user', message.transcript);
            }
            break;

          case 'response.created':
            hasActiveResponseRef.current = true;
            currentAssistantMessageRef.current = '';
            setState('waiting');
            break;

          case 'response.output_item.added':
            break;

          case 'response.audio.delta':
            setState('speaking');
            break;

          case 'response.audio_transcript.delta':
            if (message.delta) {
              currentAssistantMessageRef.current += message.delta;
            }
            setState('speaking');
            break;

          case 'response.audio_transcript.done': {
            const fullTranscript =
              message.transcript || currentAssistantMessageRef.current.trim();
            if (fullTranscript) {
              addChatMessage('assistant', fullTranscript);
              currentAssistantMessageRef.current = '';
            }
            break;
          }

          case 'response.function_call_arguments.delta':
            {
              const { call_id, name, delta } = message;
              const entry = pendingCallsRef.current.get(call_id) ?? {
                name: '',
                argsText: '',
              };
              // Name may come only once or in deltas depending on model
              if (name) entry.name = name;
              entry.argsText += delta || ''; // concatenate deltas into a JSON string
              pendingCallsRef.current.set(call_id, entry);
            }
            break;

          case 'response.function_call_arguments.done':
            // Tool call is complete, execute it
            handleToolCall(message);
            break;

          case 'response.done':
            hasActiveResponseRef.current = false;
            setState('listening');
            break;

          case 'response.cancelled':
            hasActiveResponseRef.current = false;
            setState('listening');
            break;

          case 'error':
            if (message.error?.code !== 'response_cancel_not_active') {
              setError(`Error from Azure: ${JSON.stringify(message.error)}`);
            }
            setState('listening');
            break;

          default:
            break;
        }
      } catch (err) {
        // Silently handle parse errors
      }
    },
    [addChatMessage, handleToolCall],
  );

  const initWebRTC = useCallback(
    async (config: {
      sessionId: string;
      ephemeralKey: string;
      model: string;
      region?: string;
      toolSchemas: any[];
    }) => {
      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      peerConnection.ontrack = event => {
        if (audioElementRef.current && event.streams[0]) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaStreamRef.current = mediaStream;

      const audioTrack = mediaStream.getAudioTracks()[0];
      peerConnection.addTrack(audioTrack, mediaStream);

      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      const dataChannel = peerConnection.createDataChannel('realtime-channel');
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener('open', async () => {
        if (dataChannel.readyState === 'open') {
          // Fetch current user info
          let userInfoText = '';
          try {
            const userInfo = await api.getCurrentUser();
            userInfoText = `\n\nCalling User: ${userInfo.displayName} (${userInfo.email})`;
          } catch (err) {
            // Failed to fetch user info
          }

          // Build a description of available tools for the instructions
          const toolDescriptions = config.toolSchemas
            .map(tool => `- ${tool.name}: ${tool.description}`)
            .join('\n');

          const instructions =
            config.toolSchemas.length > 0
              ? `You are a helpful, concise assistant. You have access to the following tools that you can use to help the user:

${toolDescriptions}

When asked about your capabilities or available tools, list these specific tools. Use these tools whenever they would be helpful to answer the user's questions accurately.${userInfoText}`
              : `You are a helpful, concise assistant.${userInfoText}`;

          const sessionUpdate = {
            type: 'session.update',
            session: {
              instructions,
              turn_detection: {
                type: 'server_vad',
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 700,
              },
              input_audio_transcription: {
                model: 'whisper-1',
              },
              tools:
                config.toolSchemas.length > 0 ? config.toolSchemas : undefined,
            },
          };

          dataChannel.send(JSON.stringify(sessionUpdate));
        }
        setState('listening');
      });

      dataChannel.addEventListener('message', handleDataChannelMessage);

      dataChannel.addEventListener('close', () => {
        cleanup();
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const region = config.region || 'eastus2';
      const webrtcUrl = `https://${region}.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${config.model}`;

      const sdpResponse = await fetch(webrtcUrl, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${config.ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC setup failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await peerConnection.setRemoteDescription(answer);
    },
    [handleDataChannelMessage, api, cleanup],
  );

  const connect = useCallback(async () => {
    try {
      setError(null);

      // Fetch tool schemas first
      const schemas = await api.getToolSchemas();

      const config = await api.createSession({ voice: 'alloy' });

      await initWebRTC({
        sessionId: config.sessionId,
        ephemeralKey: config.ephemeralKey,
        model: config.model,
        region: (config as any).region,
        toolSchemas: schemas, // Pass schemas directly, not from state
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setState('idle');
    }
  }, [api, initWebRTC]);

  const hangup = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const manualInterrupt = useCallback(() => {
    if (
      hasActiveResponseRef.current ||
      state === 'speaking' ||
      state === 'waiting'
    ) {
      currentAssistantMessageRef.current = '';

      if (
        hasActiveResponseRef.current &&
        dataChannelRef.current?.readyState === 'open'
      ) {
        dataChannelRef.current.send(
          JSON.stringify({ type: 'response.cancel' }),
        );
      }

      hasActiveResponseRef.current = false;
      setState('listening');
    }
  }, [state]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const stateLabels: Record<SessionState, string> = {
    idle: 'Idle',
    listening: 'Listening...',
    speaking: 'Assistant Speaking...',
    waiting: 'Processing...',
  };

  const getStateBackgroundColor = (currentState: SessionState) => {
    if (currentState === 'idle') return 'grey.900';
    if (currentState === 'listening') return 'primary.light';
    if (currentState === 'speaking') return 'secondary.light';
    return 'warning.light';
  };

  const getStateDotColor = (currentState: SessionState) => {
    if (currentState === 'idle') return 'grey.500';
    if (currentState === 'listening') return 'primary.main';
    if (currentState === 'speaking') return 'secondary.main';
    return 'warning.main';
  };

  const isConnected = state !== 'idle';

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: '0 auto' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              onClick={connect}
              disabled={isConnected}
            >
              Connect & Speak
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={hangup}
              disabled={!isConnected}
            >
              Hang Up
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={manualInterrupt}
              disabled={!(state === 'speaking' || state === 'waiting')}
              startIcon={<InterruptIcon />}
            >
              Interrupt AI
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setChatDialogOpen(true)}
              startIcon={<ChatIcon />}
            >
              View Chat History
            </Button>
          </Box>

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              padding: 2,
              borderRadius: 2,
              backgroundColor: getStateBackgroundColor(state),
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStateDotColor(state),
                animation: state !== 'idle' ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.5, transform: 'scale(0.9)' },
                },
              }}
            />
            <Typography variant="body1" fontWeight="500">
              {stateLabels[state]}
            </Typography>
          </Box>

          {(state === 'speaking' || state === 'listening') && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                height: 40,
                mt: 2,
              }}
            >
              {[0, 1, 2, 3, 4].map(i => (
                <Box
                  key={i}
                  sx={{
                    width: 4,
                    background: 'linear-gradient(180deg, #2196f3, #1976d2)',
                    borderRadius: 1,
                    animation: 'wave 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`,
                    '@keyframes wave': {
                      '0%, 100%': { height: '10px' },
                      '50%': { height: '30px' },
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={chatDialogOpen}
        onClose={() => setChatDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Conversation History
          <IconButton onClick={() => setChatDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{ minHeight: 300, maxHeight: 500, bgcolor: 'background.default' }}
        >
          {chatHistory.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ mt: 4 }}
            >
              No messages yet. Start a conversation!
            </Typography>
          ) : (
            chatHistory.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                  animation: 'slideIn 0.3s ease-out',
                  '@keyframes slideIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontWeight: 500 }}
                >
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </Typography>
                <Box
                  sx={{
                    padding: 1.5,
                    borderRadius: 2,
                    maxWidth: '80%',
                    backgroundColor:
                      msg.role === 'user' ? 'primary.main' : 'background.paper',
                    color:
                      msg.role === 'user'
                        ? 'primary.contrastText'
                        : 'text.primary',
                    border: msg.role === 'assistant' ? 1 : 0,
                    borderColor: 'divider',
                    borderBottomRightRadius:
                      msg.role === 'user' ? 4 : undefined,
                    borderBottomLeftRadius:
                      msg.role === 'assistant' ? 4 : undefined,
                  }}
                >
                  <Typography variant="body2">{msg.content}</Typography>
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={clearChatHistory} color="inherit">
            Clear History
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
