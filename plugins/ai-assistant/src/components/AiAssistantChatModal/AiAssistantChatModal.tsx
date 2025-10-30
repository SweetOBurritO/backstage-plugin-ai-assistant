import { useState } from 'react';
import { Conversation } from '../Conversation';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export interface AiAssistantChatModalProps {
  // Whether to show the floating action button
  showFloatingButton?: boolean;
  // Props for controlled modal state
  open?: boolean;
  onClose?: () => void;
  conversationId?: string;
  setConversationId?: (id: string | undefined) => void;
}

export const AiAssistantChatModal = ({
  showFloatingButton = true,
  open: controlledOpen,
  onClose: controlledOnClose,
  conversationId: controlledConversationId,
  setConversationId: controlledSetConversationId,
}: AiAssistantChatModalProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConversationId, setModalConversationId] = useState<string>();

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
      {showFloatingButton && (
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
            ':hover': {
              cursor: 'pointer',
              boxShadow: theme => theme.shadows[6],
              bgcolor: theme => theme.palette.action.hover,
            },
          }}
          onClick={handleModalOpen}
        >
          <AutoAwesomeIcon />
        </Box>
      )}

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
              <Stack direction="row" spacing={1}>
                <Tooltip title="New Chat">
                  <IconButton onClick={openNewModalChat}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" onClick={handleModalClose}>
                  Close
                </Button>
              </Stack>
            </Stack>
            <Box flex={1} sx={{ minHeight: 0 }}>
              <Conversation
                conversationId={conversationId}
                setConversationId={setConversationId}
              />
            </Box>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};
