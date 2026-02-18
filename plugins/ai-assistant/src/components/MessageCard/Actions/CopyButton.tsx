import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import type { Message } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type CopyButtonProps = {
  message: Message;
};

export const CopyButton = ({ message }: CopyButtonProps) => {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
      <IconButton size="small" onClick={handleCopy}>
        {copied ? (
          <CheckIcon
            fontSize="medium"
            sx={{ color: theme.palette.success.main }}
          />
        ) : (
          <ContentCopyIcon
            fontSize="medium"
            sx={{ color: theme.palette.text.secondary }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};
