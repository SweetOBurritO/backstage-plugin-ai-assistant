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
import Fab from '@mui/material/Fab';
import ChatIcon from '@mui/icons-material/Chat';

interface AiAssistantChatModalProps {
  // Whether to show the floating action button
  showFloatingButton?: boolean;
}

export const AiAssistantChatModal = ({
  showFloatingButton = true,
}: AiAssistantChatModalProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConversationId, setModalConversationId] = useState<string>();

  const handleModalOpen = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const openNewModalChat = () => {
    setModalConversationId(undefined);
  };

  return (
    <>
      {showFloatingButton && (
        <Box
          sx={{
            position: 'fixed',
            top: '80%',
            left: '94.56%',
            zIndex: 9999,
          }}
        >
          <Fab color="primary" aria-label="open chat" onClick={handleModalOpen}>
            <ChatIcon />
          </Fab>
        </Box>
      )}

      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: 'absolute' as 'absolute',
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
              <Typography id="modal-modal-title" variant="h6" component="h2">
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
                conversationId={modalConversationId}
                setConversationId={setModalConversationId}
              />
            </Box>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};
