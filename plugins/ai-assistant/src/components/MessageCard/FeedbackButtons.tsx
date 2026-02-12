import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useApi } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../api/chat';

export type FeedbackButtonsProps = {
  messageId?: string;
  initialScore?: number;
  content: string;
};

export const FeedbackButtons = ({
  messageId,
  initialScore = 0,
  content,
}: FeedbackButtonsProps) => {
  const chatApi = useApi(chatApiRef);
  const theme = useTheme();
  const [score, setScore] = useState<number>(initialScore); // 0 = no feedback, 1 = helpful, -1 = not helpful

  const handleFeedback = async (feedback: 'good' | 'bad') => {
    const targetScore = feedback === 'good' ? 1 : -1;
    // Toggle: if clicking the same button again, reset to 0
    const newScore = score === targetScore ? 0 : targetScore;
    setScore(newScore);

    chatApi.scoreMessage(messageId!, newScore);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 1,
        mt: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary }}
      >
        Was this response helpful?
      </Typography>
      <IconButton size="small" onClick={() => handleFeedback('good')}>
        <ThumbUpIcon
          fontSize="small"
          sx={{ color: score === 1 ? theme.palette.success.main : 'inherit' }}
        />
      </IconButton>
      <IconButton size="small" onClick={() => handleFeedback('bad')}>
        <ThumbDownIcon
          fontSize="small"
          sx={{ color: score === -1 ? theme.palette.error.main : 'inherit' }}
        />
      </IconButton>

      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary }}
      >
        Copy to clipboard
      </Typography>
      <IconButton
        size="small"
        onClick={() => navigator.clipboard.writeText(content)}
      >
        <ContentCopyIcon
          fontSize="small"
          sx={{ color: score === -1 ? theme.palette.error.main : 'inherit' }}
        />
      </IconButton>
    </Box>
  );
};
