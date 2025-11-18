import { useEffect, useState } from 'react';
import { Conversation } from '../Conversation';
import type { Conversation as ConversationType } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { useAsync, useList } from 'react-use';
import { chatApiRef } from '../../api/chat';
import { useTheme } from '@mui/material/styles';

import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItem from '@mui/material/ListItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import { useApi } from '@backstage/core-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { useChatSettings } from '../../hooks/use-chat-settings';

export const AiAssistantPage = () => {
  const chatApi = useApi(chatApiRef);
  const signalApi = useApi(signalApiRef);

  const theme = useTheme();

  const chatSettings = useChatSettings();

  useEffect(() => {
    chatSettings.setModalVisible(false);
  }, [chatSettings]);

  const [conversationId, setConversationId] = useState<string>();

  const { value: conversationHistory } = useAsync(
    () => chatApi.getConversations(),
    [chatApi],
  );

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

  const openNewChat = () => {
    setConversationId(undefined);
  };

  return (
    <>
      <Stack
        padding={2}
        spacing={2}
        flex={1}
        height="100vh"
        maxHeight="100vh"
        boxSizing="border-box"
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
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
        <Conversation
          conversationId={conversationId}
          setConversationId={setConversationId}
        />
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
                  onClick={() => setConversationId(conversation.id)}
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
    </>
  );
};
