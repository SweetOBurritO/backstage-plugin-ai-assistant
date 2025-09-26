import { useApi, errorApiRef } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../api/chat';
import { useAsync, useAsyncFn, useList, useLocalStorage } from 'react-use';
import { useEffect, useRef, useState } from 'react';
import {
  signalApiRef,
  SignalSubscriber,
} from '@backstage/plugin-signals-react';

import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import NorthIcon from '@mui/icons-material/North';
import Button from '@mui/material/Button';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { MessageCard } from '../MessageCard';

type ConversationOptions = {
  conversationId: string | undefined;
  setConversationId: (id: string) => void;
};

export const Conversation = ({
  conversationId,
  setConversationId,
}: ConversationOptions) => {
  const chatApi = useApi(chatApiRef);
  const errorApi = useApi(errorApiRef);
  const signalApi = useApi(signalApiRef);

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [modelId, setModelId] = useLocalStorage<string | undefined>(
    'modelId',
    undefined,
  );

  const [messageSubscriber, setMessageSubscriber] = useState<
    SignalSubscriber | undefined
  >();

  const { value: models, loading: loadingModels } = useAsync(
    () => chatApi.getModels(),
    [chatApi],
  );
  const { value: history, loading: loadingHistory } = useAsync(
    () => chatApi.getConversation(conversationId),
    [chatApi, conversationId],
  );

  const [messages, { push, set, updateAt }] = useList<Message>([]);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!history) {
      return;
    }

    set(history);
  }, [history, set]);

  useEffect(() => {
    if (models && models.length && !modelId) {
      setModelId(models[0]);
    }
  }, [models, modelId, setModelId]);

  const [{ loading: sending, value: messageResponse }, sendMessage] =
    useAsyncFn(async () => {
      const newMessages: Message[] = [{ role: 'user', content: input }];

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

      newMessages.forEach(message => push(message));

      const response = await chatApi.sendMessage({
        conversationId,
        modelId,
        messages: newMessages,
      });

      setConversationId(response.conversationId);

      response.messages.forEach(message => push(message));

      // Get last item in response.messages
      const mostRecentMessage = response.messages.at(-1);

      if (mostRecentMessage) {
        messageSubscriber?.unsubscribe();

        const { id: messageId } = mostRecentMessage;

        setMessageSubscriber(
          signalApi.subscribe(
            `ai-assistant.chat.message-stream:${messageId}`,
            (message: Required<Message>) => {
              const index = messagesRef.current.findIndex(
                m => m.id === message.id,
              );
              if (index !== -1) {
                updateAt(index, message);
              }
            },
          ),
        );
      }

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
    ]);

  useEffect(() => {
    if (
      !messageResponse ||
      !conversationId ||
      conversationId === messageResponse.conversationId
    ) {
      return;
    }

    setConversationId(messageResponse.conversationId);
  }, [messageResponse, setConversationId, conversationId]);

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
      <Stack direction="row" spacing={2} alignItems="center">
        <Autocomplete
          options={models}
          defaultValue={modelId}
          onChange={(_, value) => setModelId(value || undefined)}
          sx={{ width: 300 }}
          renderInput={params => <TextField {...params} label="Models" />}
        />
      </Stack>
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
          {messages.map(message => (
            <MessageCard key={message.id} message={message} />
          ))}
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
          <Button
            variant="contained"
            disabled={sending || !input.trim()}
            onClick={sendMessage}
          >
            <NorthIcon />
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
