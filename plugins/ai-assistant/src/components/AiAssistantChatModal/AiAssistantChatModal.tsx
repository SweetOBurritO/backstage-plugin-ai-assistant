import { useEffect, useMemo, useState } from 'react';
import { Conversation } from '../Conversation';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useChatSettings } from '../../hooks/use-chat-settings';
import { useLocation } from 'react-router-dom';
import { usePageSummary } from '../../hooks/use-page-summary';
import { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export interface AiAssistantChatModalProps {
  open?: boolean;
  onClose?: () => void;
  conversationId?: string;
  setConversationId?: (id: string | undefined) => void;
}

export const AiAssistantChatModal = ({
  open: controlledOpen,
  onClose: controlledOnClose,
  conversationId: controlledConversationId,
  setConversationId: controlledSetConversationId,
}: AiAssistantChatModalProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConversationId, setModalConversationId] = useState<string>();

  const { modalVisible, setModalVisible, setSummaryEnabled, summaryEnabled } =
    useChatSettings();

  const location = useLocation();

  const { summary, loading, error } = usePageSummary();

  // Update visibility based on route changes
  useEffect(() => {
    setModalVisible(true);
  }, [location, setModalVisible, setSummaryEnabled]);

  useEffect(() => {
    if (!modalOpen) return;
    setSummaryEnabled(true);
  }, [modalOpen, setSummaryEnabled]);

  const additionalSystemMessages: Message[] = useMemo(() => {
    if (!summaryEnabled || !summary) return [];

    const path = location.pathname;
    const title = document.title;
    const content = `The user is currently on the page titled "${title}" located at "${path}". The page has the following context: ${summary}. Use this context to inform your responses where relevant.`;

    return [
      {
        role: 'system',
        content,
        metadata: {},
        score: 0,
      },
    ];
  }, [summaryEnabled, summary, location.pathname]);

  // If the context says the modal is not visible, don't render anything
  if (!modalVisible) {
    return <></>;
  }

  const getChipColor = () => {
    if (loading) return 'primary';
    if (error) return 'error';
    if (summary) return 'success';
    return undefined;
  };

  const getChipLabel = () => {
    if (loading) return 'Loading page context...';
    if (error) return 'Error loading page context';
    if (summary) return 'Page Context Loaded';
    return 'No page context available';
  };

  // Use controlled props if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : modalOpen;
  const conversationId =
    controlledConversationId !== undefined
      ? controlledConversationId
      : modalConversationId;
  const setConversationId =
    controlledSetConversationId || setModalConversationId;

  const handleModalOpen = () => {
    if (controlledOpen === undefined) {
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setModalOpen(false);
    }
  };

  const openNewModalChat = () => {
    setConversationId(undefined);
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          bottom: theme => theme.spacing(2),
          right: theme => theme.spacing(2),
          borderRadius: '50%',
          boxShadow: theme => theme.shadows[4],
          bgcolor: theme => theme.palette.background.paper,
          border: theme => `1px solid ${theme.palette.primary.main}`,
          width: 50,
          height: 50,
          padding: theme => theme.spacing(1),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: theme => theme.zIndex.modal - 1,
          ':hover': {
            cursor: 'pointer',
            boxShadow: theme => theme.shadows[6],
            bgcolor: theme => theme.palette.background.default,
          },
        }}
        onClick={handleModalOpen}
      >
        <AutoAwesomeIcon />
      </Box>

      <Modal open={isOpen} onClose={handleModalClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60vw',
            height: '60vh',
            bgcolor: 'background.paper',
            border: '1px solid #000',
            padding: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack spacing={2} flex={1} height="100%">
            <Stack
              direction="row"
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" component="h2">
                AI Assistant
              </Typography>
              {summaryEnabled && (
                <Tooltip
                  title={summary ?? 'No summary available'}
                  placement="bottom"
                >
                  <Chip
                    label={getChipLabel()}
                    color={getChipColor()}
                    variant="outlined"
                  />
                </Tooltip>
              )}
              <Stack direction="row" spacing={1}>
                <Tooltip title="New Chat" placement="bottom">
                  <IconButton onClick={openNewModalChat}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" onClick={handleModalClose}>
                  Close
                </Button>
              </Stack>
            </Stack>
            <Conversation
              conversationId={conversationId}
              setConversationId={setConversationId}
              additionalSystemMessages={additionalSystemMessages}
            />
          </Stack>
        </Box>
      </Modal>
    </>
  );
};
