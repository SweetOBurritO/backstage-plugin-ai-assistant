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
import { McpServersTab } from './McpServersTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto', // Allow content to scroll independently
      }}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  );
}

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
      PaperProps={{
        sx: { height: '80vh', maxHeight: 800 },
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
                  minHeight: 48,
                  pl: 1, // Add additional left padding to individual tabs
                },
              }}
            >
              <Tab label="MCP Servers" />
            </Tabs>
          </Box>

          <TabPanel value={selectedTab} index={0}>
            <McpServersTab />
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            <Typography variant="h6">Other Settings</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Additional configuration options will be available here.
            </Typography>
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            <Typography variant="h6">Advanced Settings</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Advanced configuration options will be available here.
            </Typography>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
