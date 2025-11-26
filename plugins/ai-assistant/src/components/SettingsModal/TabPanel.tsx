import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

import { ReactNode } from 'react';

export type TabPanelProps = {
  title: string;
  description: string;
  children: ReactNode;
  index: number;
  value: number;
};

const TabPanelHeader = ({
  title,
  description,
}: Pick<TabPanelProps, 'title' | 'description'>) => {
  return (
    <Stack direction="column" justifyContent="space-between" alignItems="start">
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
};

export const TabPanel = (props: TabPanelProps) => {
  const { children, value, index } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto', // Allow content to scroll independently
        padding: 2,
      }}
    >
      {value === index && (
        <Box>
          <Stack spacing={2}>
            <TabPanelHeader {...props} />
            <Divider />
            <Box>{children}</Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
