import { useEffect, useMemo } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { useAsync, useLocalStorage } from 'react-use';
import { chatApiRef } from '../../../../api/chat';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export const Tab = () => {
  const chatApi = useApi(chatApiRef);
  const [modelId, setModelId] = useLocalStorage<string | undefined>(
    'modelId',
    undefined,
  );

  const {
    value: models,
    loading,
    error,
  } = useAsync(() => chatApi.getModels(), [chatApi]);

  const sortedModels = useMemo(() => {
    if (!models) {
      return [];
    }

    return [...models].sort((a, b) => a.localeCompare(b));
  }, [models]);

  useEffect(() => {
    if (!modelId && sortedModels.length > 0) {
      setModelId(sortedModels[0]);
    }
  }, [modelId, setModelId, sortedModels]);

  if (loading) {
    return <Alert severity="info">Loading models...</Alert>;
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load models. Please try refreshing the page.
      </Alert>
    );
  }

  if (!sortedModels.length) {
    return <Alert severity="info">No models available.</Alert>;
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 720,
        ml: 0,
        mr: 'auto',
        px: { xs: 1, sm: 2 },
      }}
    >
      <Stack spacing={2.5} alignItems="flex-start">
        <Typography variant="subtitle2">Model Selection</Typography>

        <Autocomplete
          options={sortedModels}
          defaultValue={modelId}
          onChange={(_, value) => setModelId(value || undefined)}
          sx={{
            alignSelf: 'flex-start',
            width: { xs: '100%', sm: 300 },
            maxWidth: 300,
          }}
          size="small"
          renderInput={params => <TextField {...params} label="Models" />}
        />
      </Stack>
    </Box>
  );
};
