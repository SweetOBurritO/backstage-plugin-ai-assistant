import { useApi, errorApiRef } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../api/chat';
import { useAsync, useAsyncFn, useLocalStorage } from 'react-use';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { useSearchParams } from 'react-router-dom';

import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import NorthIcon from '@mui/icons-material/North';
import SettingsIcon from '@mui/icons-material/Settings';
import Button from '@mui/material/Button';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { MessageCard } from '../MessageCard';
import { SettingsModal } from '../SettingsModal';
import { useAnalytics, useChatSettings } from '../../hooks';

type ConversationOptions = {
  conversationId: string | undefined;
  setConversationId: (id: string) => void;
  additionalSystemMessages?: Message[];
};

export const Conversation = ({
  conversationId,
  setConversationId,
  additionalSystemMessages,
}: ConversationOptions) => {
  const chatApi = useApi(chatApiRef);
  const errorApi = useApi(errorApiRef);
  const signalApi = useApi(signalApiRef);
  const analytics = useAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('query') ?? '';

  const [input, setInput] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQuery && searchParams.has('query')) {
      setSearchParams(params => {
        params.delete('query');
        return params;
      });
    }
  }, [initialQuery, searchParams, setSearchParams]);

  const [modelId, setModelId] = useLocalStorage<string | undefined>(
    'modelId',
    undefined,
  );

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { value: models, loading: loadingModels } = useAsync(
    () => chatApi.getModels(),
    [chatApi],
  );

  const { value: history, loading: loadingHistory } = useAsync(
    () => chatApi.getConversation(conversationId),
    [chatApi, conversationId],
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const { toolsEnabled } = useChatSettings();

  useEffect(() => {
    if (!history || !history.length) {
      return;
    }

    setMessages(history);
  }, [history, setMessages]);

  const handleMessageUpdate = useCallback(
    (newMessages: Required<Message>[]) => {
      setMessages(prev => {
        const updated = [...prev];

        newMessages.forEach(message => {
          const index = updated.findIndex(m => m.id === message.id);

          if (index === -1 && message.role !== 'human') {
            analytics.captureEvent({
              action: 'message_received',
              subject: modelId ?? 'none',
            });
          }

          if (index === -1) {
            updated.push(message);
          } else {
            updated[index] = message;
          }
        });

        return updated;
      });
    },
    [setMessages, analytics, modelId],
  );

  useEffect(() => {
    if (!conversationId) {
      return undefined;
    }

    const subscriber = signalApi.subscribe(
      `ai-assistant.chat.conversation-stream:${conversationId}`,
      (event: { messages: Required<Message>[] }) => {
        handleMessageUpdate(event.messages);
      },
    );

    return () => {
      subscriber.unsubscribe();
    };
  }, [conversationId, signalApi, handleMessageUpdate]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    if (models && models.length && !modelId) {
      setModelId(models[0]);
    }
  }, [models, modelId, setModelId]);

  const [{ loading: sending }, sendMessage] = useAsyncFn(async () => {
    analytics.captureEvent({
      action: 'message_sent',
      subject: modelId ?? 'none',
    });

    const newMessages: Message[] = [
      { role: 'human', content: input, metadata: {}, score: 0 },
    ];

    if (!modelId) {
      errorApi.post({
        name: 'NoModelError',
        message:
          'No model has been selected for this conversation. Please select a model before sending a message',
      });
      return undefined;
    }

    setInput('');
    inputRef.current?.focus();

    setMessages(prev => [...prev, ...newMessages]);

    try {
      const response = await chatApi.sendMessage({
        conversationId,
        modelId,
        messages: additionalSystemMessages
          ? [...additionalSystemMessages, ...newMessages]
          : newMessages,
        tools: toolsEnabled,
      });

      setConversationId(response.conversationId);

      return response;
    } catch (error) {
      errorApi.post({
        name: 'MessageSendError',
        message: `Failed to send message: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
      // Remove the user message from the UI since it failed
      setMessages(prev => prev.slice(0, -1));
      return undefined;
    }
  }, [
    input,
    inputRef,
    chatApi,
    setConversationId,
    conversationId,
    modelId,
    errorApi,
    setInput,
    toolsEnabled,
    additionalSystemMessages,
  ]);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loadingHistory && loadingModels) {
    return <Typography>Loading...</Typography>;
  }

  if (!models) {
    return <Typography>No models available</Typography>;
  }

  return (
    <Stack
      padding={2}
      spacing={2}
      flex={1}
      boxSizing="border-box"
      height="100%"
      minHeight={0}
    >
      {messages && (
        <Stack
          spacing={1}
          flex={1}
          sx={{
            overflowY: 'auto',
            pr: 1,
            '&::-webkit-scrollbar': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
          }}
        >
          {messages.map((message, idx) => (
            <MessageCard
              key={message.id ?? idx}
              message={message}
              loading={false}
            />
          ))}
          {messages[messages.length - 1] &&
            messages[messages.length - 1]?.role !== 'ai' && (
              <MessageCard
                message={{ content: '', role: 'ai', metadata: {}, score: 0 }}
                loading
              />
            )}
          <div ref={messageEndRef} />
        </Stack>
      )}

      <Paper elevation={2} sx={{ padding: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="start"
        >
          <TextField
            multiline
            maxRows={3}
            variant="standard"
            sx={{ flex: 1 }}
            value={input}
            onChange={e => setInput(e.target.value)}
            inputRef={inputRef}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Autocomplete
            options={models}
            defaultValue={modelId}
            onChange={(_, value) => setModelId(value || undefined)}
            sx={{ width: 180 }}
            size="small"
            renderInput={params => <TextField {...params} label="Models" />}
          />
          <Button
            disabled={sending}
            variant="contained"
            color="info"
            title="Settings"
            onClick={() => setSettingsModalOpen(true)}
          >
            <SettingsIcon />
          </Button>
          <Button
            variant="contained"
            disabled={sending || !input.trim()}
            onClick={sendMessage}
          >
            <NorthIcon />
          </Button>
        </Stack>
      </Paper>

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </Stack>
  );
};
