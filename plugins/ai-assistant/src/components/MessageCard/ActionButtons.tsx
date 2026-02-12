import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export type ActionButtonsProps = {
  content: string;
};

export const ActionButtons = ({ content }: ActionButtonsProps) => {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 1,
        mt: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary }}
      >
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Typography>
      <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
        <IconButton size="small" onClick={handleCopy}>
          {copied ? (
            <CheckIcon
              fontSize="small"
              sx={{ color: theme.palette.success.main }}
            />
          ) : (
            <ContentCopyIcon
              fontSize="small"
              sx={{ color: theme.palette.text.secondary }}
            />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
