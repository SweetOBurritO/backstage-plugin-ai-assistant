import { useEffect, useState } from 'react';
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
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
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

  const handleMobileTabSelect = (index: number) => {
    setSelectedTab(index);
    setMobileView('details');
  };

  const selectedTabData = tabs[selectedTab];
  const selectedTabStyles = {
    backgroundColor: 'action.selected',
    borderRight: 3,
    borderRightColor: 'primary.main',
    color: 'primary.main',
  };

  const renderMobileMenu = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
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

      <DialogContent dividers sx={{ p: 0 }}>
        <List disablePadding sx={{ width: '100%' }}>
          {tabs.map((tab, index) => (
            <ListItemButton
              key={tab.name}
              onClick={() => handleMobileTabSelect(index)}
              selected={selectedTab === index}
              sx={{
                width: '100%',
                pl: 3,
                pr: 2,
                py: 1.5,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderBottom: 1,
                borderColor: 'divider',
                '&.Mui-selected': selectedTabStyles,
                '&.Mui-selected:hover': selectedTabStyles,
              }}
            >
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle1"
                    fontWeight={selectedTab === index ? 700 : 600}
                  >
                    {tab.title}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </>
  );

  const renderMobileTabContent = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setMobileView('menu')}
          sx={{ px: 0.5 }}
        >
          Back
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <TabPanel
          value={selectedTab}
          index={selectedTab}
          title={selectedTabData.title}
          description={selectedTabData.description}
        >
          <selectedTabData.Tab />
        </TabPanel>
      </DialogContent>
    </>
  );

  const renderDesktopContent = () => (
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
              flexShrink: 0,
            }}
          >
            <Tabs
              orientation="vertical"
              variant="standard"
              value={selectedTab}
              onChange={handleTabChange}
              sx={{
                pl: 0,
                '& .MuiTab-root': {
                  width: '100%',
                  maxWidth: 'none',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  pl: 3,
                  pr: 2,
                  minHeight: themeSpacing => themeSpacing.spacing(5),
                  borderRight: 3,
                  borderRightColor: 'transparent',
                  '&.Mui-selected': selectedTabStyles,
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
    </>
  );

  const renderContent = () => {
    if (!isMobile) {
      return renderDesktopContent();
    }

    if (mobileView === 'menu') {
      return renderMobileMenu();
    }

    return renderMobileTabContent();
  };

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
