import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { PropsWithChildren } from 'react';
import { useTheme } from '@mui/material/styles';

type CardProps = PropsWithChildren & {
  role: string;
};

export const Card = ({ children, role }: CardProps) => {
  const theme = useTheme();
  return (
    <Paper
      sx={{
        alignSelf: role === 'user' ? 'end' : 'start',
        maxWidth: '70%',
        width: '70%',
        borderRadius: 2,
        border: 'double transparent',
        borderWidth: role !== 'user' ? '2px' : 0,
        backgroundImage: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}), linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'content-box, border-box',
        wordBreak: 'break-word',
      }}
      elevation={2}
    >
      <Box p={1}>{children}</Box>
    </Paper>
  );
};
