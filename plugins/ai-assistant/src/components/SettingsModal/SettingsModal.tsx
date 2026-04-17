import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [mobileView, setMobileView] = useState<'menu' | 'details'>('menu');

  useEffect(() => {
    if (open && isMobile) {
      setMobileView('menu');
    }
  }, [open, isMobile]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const renderContent = () => (
    <>
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
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close settings"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: isMobile ? 1 : 2,
            pt: 1,
            bgcolor: 'background.paper',
          }}
        >
          <Tabs
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={selectedTab}
            onChange={handleTabChange}
            aria-label="Settings sections"
            sx={{
              minHeight: 44,
              '& .MuiTabs-flexContainer': {
                gap: 0.5,
              },
              '& .MuiTab-root': {
                minHeight: 44,
                px: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                label={tab.name}
                id={`settings-tab-${index}`}
                aria-controls={`settings-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, bgcolor: 'background.paper' }}>
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
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: isMobile ? '100dvh' : '80vh',
            maxHeight: isMobile ? '100dvh' : 800,
          },
        },
      }}
    >
      {renderContent()}
    </Dialog>
  );
};
