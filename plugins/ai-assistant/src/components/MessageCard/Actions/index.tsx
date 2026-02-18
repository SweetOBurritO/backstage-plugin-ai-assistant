import Box from '@mui/material/Box';
import type { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { FeedbackButtons } from './FeedbackButtons';
import { CopyButton } from './CopyButton';

export type ActionsProps = {
  message: Message;
};

export const Actions = ({ message }: ActionsProps) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 1,
      mt: 1,
    }}
  >
    <CopyButton message={message} />
    <FeedbackButtons message={message} />
  </Box>
);
