import Paper from '@mui/material/Paper';
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
        overflow: 'hidden',
        border: 'double transparent',
        borderWidth: role !== 'user' ? '2px' : 0,
        backgroundImage: `linear-gradient(white, white), linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'content-box, border-box',
      }}
      elevation={2}
    >
      <Paper
        sx={{
          width: '100%',
          wordBreak: 'break-word',
          padding: 1,
          borderRadius: 0,
        }}
      >
        {children}
      </Paper>
    </Paper>
  );
};
