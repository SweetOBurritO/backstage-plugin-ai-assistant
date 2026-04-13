import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { TabPanel } from './TabPanel';
import tabs from './tabs';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: { height: '80vh', maxHeight: 800 },
        },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SettingsIcon />
            <Typography variant="h6">Settings</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box
          sx={{
            flexGrow: 1,
            bgcolor: 'background.paper',
            display: 'flex',
            height: '100%',
          }}
        >
          <Box
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              minWidth: 200,
              flexShrink: 0, // Prevent tabs from shrinking
            }}
          >
            <Tabs
              orientation="vertical"
              variant="standard"
              value={selectedTab}
              onChange={handleTabChange}
              sx={{
                pl: 2, // Add left padding to the tabs container
                '& .MuiTab-root': {
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  pl: 1,
                  minHeight: theme => theme.spacing(5), // Increase minHeight for better spacing
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab key={index} label={tab.name} aria-label={tab.title} />
              ))}
            </Tabs>
          </Box>

          {tabs.map((tab, index) => (
            <TabPanel
              key={index}
              value={selectedTab}
              index={index}
              title={tab.title}
              description={tab.description}
            >
              <tab.Tab />
            </TabPanel>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
