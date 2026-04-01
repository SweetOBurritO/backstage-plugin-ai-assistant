import { useApi, errorApiRef, storageApiRef } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../api/chat';
import {
  useAsync,
  useAsyncFn,
  useLocalStorage,
  useObservable,
} from 'react-use';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const SCROLL_BOTTOM_THRESHOLD_PX = 80;

const SETTINGS_BUTTON_CLICKED_KEY = 'ai-assistant.settings-button-clicked';
export const Conversation = ({
  conversationId,
  setConversationId,
  additionalSystemMessages,
}: ConversationOptions) => {
  const chatApi = useApi(chatApiRef);
  const errorApi = useApi(errorApiRef);
  const signalApi = useApi(signalApiRef);
  const storageApi = useApi(storageApiRef).forBucket(
    SETTINGS_BUTTON_CLICKED_KEY,
  );
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
  const settingsButtonClickedSnapshot = useObservable(
    storageApi.observe$(SETTINGS_BUTTON_CLICKED_KEY),
    storageApi.snapshot(SETTINGS_BUTTON_CLICKED_KEY),
  );
  const settingsButtonClicked = useMemo(() => {
    if (
      !settingsButtonClickedSnapshot ||
      settingsButtonClickedSnapshot.presence === 'absent'
    ) {
      return false;
    }
    return (settingsButtonClickedSnapshot.value as boolean) ?? false;
  }, [settingsButtonClickedSnapshot]);

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
  ]);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const isUserAtBottomRef = useRef(true);

  const getIsNearBottom = useCallback((element: HTMLDivElement) => {
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
  }, []);

  const syncUserAtBottom = useCallback((value: boolean) => {
    isUserAtBottomRef.current = value;
    setIsUserAtBottom(value);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    syncUserAtBottom(getIsNearBottom(messagesContainerRef.current));
  }, [getIsNearBottom, syncUserAtBottom]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      messageEndRef.current?.scrollIntoView({ behavior });
      syncUserAtBottom(true);
    },
    [syncUserAtBottom],
  );

  useEffect(() => {
    if (!isUserAtBottomRef.current) {
      return;
    }

    scrollToBottom('auto');
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    syncUserAtBottom(getIsNearBottom(messagesContainerRef.current));
  }, [messages, getIsNearBottom, syncUserAtBottom]);

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
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          spacing={1}
          flex={1}
          sx={theme => ({
            overflowY: 'auto',
            pr: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.palette.action.disabled} transparent`,
            '&::-webkit-scrollbar': {
              width: 10,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.action.disabled,
              borderRadius: 8,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: theme.palette.action.active,
            },
          })}
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

      {!isUserAtBottom && messages.length > 0 && (
        <Button
          variant="outlined"
          onClick={() => scrollToBottom('smooth')}
          sx={{ alignSelf: 'center' }}
        >
          Scroll to bottom ↓
        </Button>
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
            aria-label="Settings"
            onClick={() => {
              storageApi.set(SETTINGS_BUTTON_CLICKED_KEY, true).catch(err => {
                errorApi.post({
                  message: `Failed to update settings button state: ${
                    (err as Error).message
                  }. This will cause the settings button animation to still play on every render. Please try again.`,
                  name: 'SettingsButtonStateError',
                });
              });

              setSettingsModalOpen(true);
            }}
            sx={{
              '@keyframes jump-shaking': {
                '0%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateY(-9px)' },
                '35%': { transform: 'translateY(-9px) rotate(17deg)' },
                '55%': { transform: 'translateY(-9px) rotate(-17deg)' },
                '65%': { transform: 'translateY(-9px) rotate(17deg)' },
                '75%': { transform: 'translateY(-9px) rotate(-17deg)' },
                '100%': { transform: 'translateY(0) rotate(0)' },
              },
              animation: settingsButtonClicked
                ? 'none'
                : 'jump-shaking 1s ease-in-out 2',
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
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
