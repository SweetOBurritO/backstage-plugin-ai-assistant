import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useApi } from '@backstage/core-plugin-api';
import { chatApiRef } from '../../../api/chat';
import type { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import Tooltip from '@mui/material/Tooltip';

export type FeedbackButtonsProps = {
  message: Message;
};

export const FeedbackButtons = ({ message }: FeedbackButtonsProps) => {
  const chatApi = useApi(chatApiRef);
  const theme = useTheme();
  const [score, setScore] = useState<number>(message.score); // 0 = no feedback, 1 = helpful, -1 = not helpful

  const handleFeedback = async (feedback: 'good' | 'bad') => {
    const targetScore = feedback === 'good' ? 1 : -1;
    // Toggle: if clicking the same button again, reset to 0
    const newScore = score === targetScore ? 0 : targetScore;
    setScore(newScore);

    chatApi.scoreMessage(message.id!, newScore);
  };

  return (
    <>
      <Tooltip
        title={score === 1 ? 'You found this helpful' : 'Mark as helpful'}
      >
        <IconButton size="small" onClick={() => handleFeedback('good')}>
          <ThumbUpIcon
            fontSize="small"
            sx={{ color: score === 1 ? theme.palette.success.main : 'inherit' }}
          />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={
          score === -1 ? 'You found this not helpful' : 'Mark as not helpful'
        }
      >
        <IconButton size="small" onClick={() => handleFeedback('bad')}>
          <ThumbDownIcon
            fontSize="small"
            sx={{ color: score === -1 ? theme.palette.error.main : 'inherit' }}
          />
        </IconButton>
      </Tooltip>
    </>
  );
};
