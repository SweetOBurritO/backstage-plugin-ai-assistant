import { useEffect, useState, useMemo, useCallback } from 'react';
import { Conversation } from '../Conversation';
import type { Conversation as ConversationType } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { useAsync, useList } from 'react-use';
import { chatApiRef } from '../../api/chat';
import { useTheme } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router-dom';

import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItem from '@mui/material/ListItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ShareIcon from '@mui/icons-material/Share';
import CircularProgress from '@mui/material/CircularProgress';

import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { useChatSettings } from '../../hooks/use-chat-settings';
import {
  conversationRouteRef,
  newConversationRouteRef,
  shareConversationRouteRef,
} from '../../routes';

type ConversationContentProps = {
  isUnauthorizedConversation: boolean;
  isImportingSharedConversation: boolean;
  conversationId: string | undefined;
  setConversation: (conversation: string | undefined) => void;
};

const ConversationContent = ({
  isUnauthorizedConversation,
  isImportingSharedConversation,
  conversationId,
  setConversation,
}: ConversationContentProps) => {
  if (isUnauthorizedConversation) {
    return (
      <Box sx={{ px: 2 }}>
        <Alert severity="error">
          Unauthorized: You do not have access to this conversation.
        </Alert>
      </Box>
    );
  }

  if (isImportingSharedConversation) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Conversation
      conversationId={conversationId}
      setConversationId={setConversation}
    />
  );
};

export const ConversationPage = () => {
  const chatApi = useApi(chatApiRef);
  const signalApi = useApi(signalApiRef);

  const newConversationRoute = useRouteRef(newConversationRouteRef);
  const conversationRoute = useRouteRef(conversationRouteRef);
  const shareConversationRoute = useRouteRef(shareConversationRouteRef);

  const { id, shareId } = useParams();
  const navigate = useNavigate();

  const theme = useTheme();

  const chatSettings = useChatSettings();

  useEffect(() => {
    chatSettings.setModalVisible(false);
  }, [chatSettings]);

  const [conversationId, setConversationId] = useState<string | undefined>(id);
  const [
    sessionAuthorizedConversationIds,
    setSessionAuthorizedConversationIds,
  ] = useState<Set<string>>(new Set());

  const { value: conversationHistory, loading: loadingConversationHistory } =
    useAsync(() => chatApi.getConversations(), [chatApi]);

  const [conversations, { set, updateAt }] = useList<ConversationType>([]);
  const [shareError, setShareError] = useState<string | undefined>(undefined);
  const [isImportingSharedConversation, setIsImportingSharedConversation] =
    useState(Boolean(shareId));

  useEffect(() => {
    if (!conversationHistory) {
      return;
    }

    set(conversationHistory);
  }, [conversationHistory, set]);

  useEffect(() => {
    const subscription = signalApi.subscribe<{
      conversation: ConversationType;
    }>(`ai-assistant.chat.conversation-details-update`, ({ conversation }) => {
      set(currentConversations => {
        const index = currentConversations.findIndex(
          c => c.id === conversation.id,
        );

        if (index !== -1) {
          const newConversations = [...currentConversations];
          newConversations[index] = conversation;
          return newConversations;
        }
        return [conversation, ...currentConversations];
      });
    });

    return () => subscription.unsubscribe();
  }, [signalApi, set, updateAt]);

  const [open, setOpen] = useState(false);

  const toggleDrawer = (drawerOpen: boolean) => () => {
    setOpen(drawerOpen);
  };

  const setConversation = useCallback(
    (conversation: string | undefined) => {
      setConversationId(conversation);

      if (conversation) {
        setSessionAuthorizedConversationIds(current => {
          const next = new Set(current);
          next.add(conversation);
          return next;
        });
      }

      if (conversation) {
        navigate(conversationRoute({ id: conversation }));
      } else {
        navigate(newConversationRoute!());
      }
    },
    [conversationRoute, navigate, newConversationRoute],
  );

  const openNewChat = useCallback(() => {
    setConversation(undefined);
  }, [setConversation]);

  const shareConversation = async () => {
    if (!conversationId) {
      return;
    }

    setShareError(undefined);

    try {
      const sharedId = await chatApi.createShareLink(conversationId);
      const shareUrl = `${window.location.origin}${shareConversationRoute({
        shareId: sharedId,
      })}`;

      await navigator.clipboard.writeText(shareUrl);
    } catch {
      setShareError('Unable to share conversation. Please try again.');
    }
  };

  useEffect(() => {
    if (!shareId) {
      setIsImportingSharedConversation(false);
      return;
    }

    setIsImportingSharedConversation(true);
    setShareError(undefined);

    chatApi
      .importSharedConversation(shareId)
      .then(newConversationId => {
        setConversation(newConversationId);
      })
      .catch(() => {
        setShareError(
          'Unable to import shared conversation. It may be invalid or unavailable.',
        );
        setIsImportingSharedConversation(false);
      });
  }, [chatApi, setConversation, shareId]);

  const isUnauthorizedConversation = useMemo(
    () =>
      Boolean(id) &&
      !loadingConversationHistory &&
      !conversations.some(conversation => conversation.id === id) &&
      !sessionAuthorizedConversationIds.has(id!),
    [
      id,
      loadingConversationHistory,
      conversations,
      sessionAuthorizedConversationIds,
    ],
  );

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          padding={2}
          justifyContent="flex-end"
        >
          <Tooltip title="New Chat">
            <IconButton onClick={openNewChat}>
              <AddIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Share Chat">
            <IconButton onClick={shareConversation} disabled={!conversationId}>
              <ShareIcon />
            </IconButton>
          </Tooltip>

          {conversations.length > 0 && (
            <Tooltip title="Chat History">
              <IconButton onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <ConversationContent
          isUnauthorizedConversation={isUnauthorizedConversation}
          isImportingSharedConversation={isImportingSharedConversation}
          conversationId={conversationId}
          setConversation={setConversation}
        />
        {shareError ? (
          <Box sx={{ px: 2, pb: 2 }}>
            <Alert severity="error">{shareError}</Alert>
          </Box>
        ) : null}
      </Stack>
      <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 300 }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          <List>
            {conversations.map(conversation => (
              <ListItem
                key={conversation.id}
                sx={{
                  fontSize: theme.typography.body1.fontSize,
                }}
              >
                <ListItemButton
                  sx={{
                    justifyContent: 'flex-start !important',
                    padding: `${theme.spacing(1)} !important`,
                    borderRadius: `${theme.spacing(1)} !important`,
                    backgroundColor:
                      conversationId === conversation.id
                        ? `${theme.palette.action.selected} !important`
                        : 'transparent !important',
                  }}
                  onClick={() => setConversation(conversation.id)}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    }}
                  >
                    {conversation.title}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};
