import { useApi, errorApiRef } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../api/chat';
import { useAsync, useAsyncFn, useLocalStorage } from 'react-use';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { pageSummarizationApiRef } from '../../api/page-summarizer';

import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import Paper from '@mui/material/Paper';
import NorthIcon from '@mui/icons-material/North';
import SettingsIcon from '@mui/icons-material/Settings';
import Button from '@mui/material/Button';
import { Box, Chip, Tooltip } from '@mui/material';
import { Info as InfoIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { MessageCard } from '../MessageCard';
import { SettingsModal } from '../Conversation/SettingsModal';

export interface ConversationWithPageContextProps {
  conversationId?: string;
  setConversationId: (id: string | undefined) => void;
  enablePageSummarization?: boolean;
}

/**
 * Enhanced conversation component that automatically fetches page context
 * when page summarization is enabled. This provides the AI assistant with
 * information about the current page the user is viewing by adding system messages.
 */
export const ConversationWithPageContext = ({
  conversationId,
  setConversationId,
  enablePageSummarization = false,
}: ConversationWithPageContextProps) => {
  const chatApi = useApi(chatApiRef);
  const errorApi = useApi(errorApiRef);
  const signalApi = useApi(signalApiRef);
  const pageSummarizationApi = useApi(pageSummarizationApiRef);

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [modelId, setModelId] = useLocalStorage<string | undefined>(
    'modelId',
    undefined,
  );

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  // Page context state
  const [pageContext, setPageContext] = useState<{
    title: string;
    url: string;
    summary: string;
  } | null>(null);
  const [isLoadingPageSummary, setIsLoadingPageSummary] = useState(false);

  const { value: models, loading: loadingModels } = useAsync(
    () => chatApi.getModels(),
    [chatApi],
  );

  const { value: history, loading: loadingHistory } = useAsync(
    () => chatApi.getConversation(conversationId),
    [chatApi, conversationId],
  );

  const [messages, setMessages] = useState<Message[]>([]);

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

          if (index === -1) {
            updated.push(message);
          } else {
            updated[index] = message;
          }
        });

        return updated;
      });
    },
    [setMessages],
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

  // Page summary fetching logic
  const fetchPageSummary = useCallback(async () => {
    if (!enablePageSummarization) {
      setPageContext(null);
      setIsLoadingPageSummary(false);
      return;
    }

    console.debug('[Modal Page Summary] Starting page summary fetch...');
    setIsLoadingPageSummary(true);

    try {
      // Check if current page should be skipped
      if (pageSummarizationApi.shouldSkipCurrentPage()) {
        console.debug('[Modal Page Summary] Skipping current page - in excluded patterns');
        setPageContext(null);
        return;
      }

      // Extract page content
      const { content, title, url } = pageSummarizationApi.extractPageContent();
      
      // Check if content is meaningful
      if (!pageSummarizationApi.isContentMeaningful(content)) {
        console.debug('[Modal Page Summary] Skipping - content not meaningful enough');
        setPageContext(null);
        return;
      }

      console.debug('[Modal Page Summary] Fetching summary for:', title);

      // Get page summary
      const result = await pageSummarizationApi.summarizePage({
        pageContent: content,
        pageUrl: url,
        pageTitle: title,
        summaryLength: 'in 2-3 sentences for AI assistant context',
      });

      if (result.success && result.summary) {
        const context = {
          title,
          url,
          summary: result.summary,
        };
        setPageContext(context);
        console.debug('[Modal Page Summary] ✅ Page context set for AI assistant:', result.summary);
      } else {
        console.error('[Modal Page Summary] ❌ Failed to get summary:', result.error);
        setPageContext(null);
      }
    } catch (error) {
      console.error('[Modal Page Summary] Error fetching page summary:', error);
      setPageContext(null);
    } finally {
      setIsLoadingPageSummary(false);
    }
  }, [pageSummarizationApi, enablePageSummarization]);

  // Fetch page summary when component mounts and page summarization is enabled
  useEffect(() => {
    if (enablePageSummarization) {
      console.debug('[Modal Page Summary] Component mounted, starting fetch...');
      // Add a small delay to ensure the modal is fully rendered
      const timeout = setTimeout(() => {
        fetchPageSummary();
      }, 100);
      
      return () => clearTimeout(timeout);
    } else {
      setPageContext(null);
      setIsLoadingPageSummary(false);
    }
    
    return undefined;
  }, [enablePageSummarization, fetchPageSummary]);

  const [{ loading: sending }, sendMessage] = useAsyncFn(async () => {
    const newMessages: Message[] = [
      { role: 'human', content: input, metadata: {}, score: 0 },
    ];

    // Add page context as system message if available
    if (pageContext) {
      const systemMessage: Message = {
        role: 'system',
        content: `Current page context: The user is currently viewing "${pageContext.title}" (${pageContext.url}). Page summary: ${pageContext.summary}`,
        metadata: { pageContext: true },
        score: 0,
      };
      newMessages.unshift(systemMessage);
    }

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

    // Only add the human message to display (not the system message)
    setMessages(prev => [...prev, { role: 'human', content: input, metadata: {}, score: 0 }]);

    const response = await chatApi.sendMessage({
      conversationId,
      modelId,
      messages: newMessages,
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
    pageContext,
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
      {enablePageSummarization && (
        <Box>
          {isLoadingPageSummary ? (
            <Tooltip title="Loading page context for AI assistant...">
              <Chip
                icon={<InfoIcon />}
                label="Loading page context..."
                size="small"
                color="info"
                variant="outlined"
              />
            </Tooltip>
          ) : pageContext ? (
            <Tooltip title={`Page context available: ${pageContext.summary}`}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Context: ${pageContext.title}`}
                size="small"
                color="success"
                variant="outlined"
              />
            </Tooltip>
          ) : (
            <Tooltip title="No page context available for this page">
              <Chip
                label="No page context"
                size="small"
                color="default"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
      )}

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
          {messages
            .filter((message) => message.role !== 'system') // Hide system messages from UI
            .map((message, idx) => (
              <MessageCard
                key={message.id ?? idx}
                message={message}
                loading={false}
              />
            ))}
          {(messages.filter(m => m.role !== 'system')[messages.filter(m => m.role !== 'system').length - 1]?.role === 'human' ||
            messages.filter(m => m.role !== 'system')[messages.filter(m => m.role !== 'system').length - 1]?.role === 'tool') && (
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