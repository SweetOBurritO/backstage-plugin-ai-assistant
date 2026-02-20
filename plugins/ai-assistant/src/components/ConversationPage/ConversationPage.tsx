import { useEffect, useState, useMemo } from 'react';
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

import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { useChatSettings } from '../../hooks/use-chat-settings';
import { conversationRouteRef, newConversationRouteRef } from '../../routes';

export const ConversationPage = () => {
  const chatApi = useApi(chatApiRef);
  const signalApi = useApi(signalApiRef);

  const newConversationRoute = useRouteRef(newConversationRouteRef);
  const conversationRoute = useRouteRef(conversationRouteRef);

  const { id } = useParams();
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

  const setConversation = (conversation: string | undefined) => {
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
  };

  const openNewChat = () => {
    setConversation(undefined);
  };

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
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',

        [theme.breakpoints.down('sm')]: {
          height: `calc(100vh - ${theme.spacing(6)})`,
          maxHeight: `calc(100vh - ${theme.spacing(6)})`,
        },
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

          {conversations.length > 0 && (
            <Tooltip title="Chat History">
              <IconButton onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {isUnauthorizedConversation ? (
          <Box sx={{ px: 2 }}>
            <Alert severity="error">
              Unauthorized: You do not have access to this conversation.
            </Alert>
          </Box>
        ) : (
          <Conversation
            conversationId={conversationId}
            setConversationId={setConversation}
          />
        )}
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
