import type { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import Markdown from 'react-markdown';
import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { Card } from './Card';

import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Stack from '@mui/material/Stack';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export type MessageCardProps = {
  message: Message;
  loading: boolean;
};

export const MessageCard = ({ message, loading }: MessageCardProps) => {
  const { content, role } = message;

  const theme = useTheme();

  const hasThinking = useMemo(() => {
    return content.startsWith('<think>');
  }, [content]);

  const thinking = useMemo<boolean>(() => {
    return (
      role === 'ai' &&
      content.includes('<think>') &&
      !content.includes('</think>')
    );
  }, [content, role]);

  const thoughtProcess = useMemo(() => {
    // Try to match <think>...</think>
    const closedMatch = content.match(/<think>(.*?)<\/think>/s);
    if (closedMatch) return closedMatch[1].trim();

    // If </think> is missing but <think> is present, get everything after <think>
    const openMatch = content.match(/<think>(.*)/s);
    if (openMatch) return openMatch[1].trim();

    return '';
  }, [content]);

  const response = useMemo<string>(() => {
    if (!hasThinking) {
      return content;
    }
    const [, contentResponse] = content.split('</think>');
    return contentResponse ?? '';
  }, [content, hasThinking]);

  if (loading) {
    return (
      <Card role={role}>
        <Skeleton
          variant="text"
          height={theme.typography.body1.fontSize}
          width={210}
        />
      </Card>
    );
  }

  if (message.role === 'tool') {
    return (
      <Typography
        variant="caption"
        sx={{ fontStyle: 'italic', color: theme.palette.text.secondary }}
      >
        Used tool{message.metadata.name ? ` ${message.metadata.name}` : ''} to
        enhance response...
      </Typography>
    );
  }

  return (
    <Card role={role}>
      {hasThinking && (
        <Accordion sx={{ paddingX: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {thinking && !response ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={theme.typography.caption.fontSize} />
                <Typography variant="caption">Thinking</Typography>
              </Stack>
            ) : (
              <Typography variant="caption">Thought Process</Typography>
            )}
          </AccordionSummary>
          <AccordionDetails>
            {thoughtProcess ? (
              <Markdown>{thoughtProcess}</Markdown>
            ) : (
              <Skeleton
                variant="text"
                height={theme.typography.caption.fontSize}
                width={40}
              />
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {message.content ? (
        <Markdown>{message.content}</Markdown>
      ) : (
        <Skeleton
          variant="text"
          height={theme.typography.caption.fontSize}
          width={40}
        />
      )}
      <br />
    </Card>
  );
};
