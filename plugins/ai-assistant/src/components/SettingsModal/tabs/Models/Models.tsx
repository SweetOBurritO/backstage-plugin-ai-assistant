import { useEffect, useMemo } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { useAsync, useLocalStorage } from 'react-use';
import { chatApiRef } from '../../../../api/chat';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

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
    <Stack spacing={2}>
      <TextField
        label="Model"
        size="small"
        fullWidth
        value={modelId ?? 'No model selected'}
        slotProps={{
          htmlInput: {
            readOnly: true,
          },
        }}
      />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Available Models
        </Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {sortedModels.map(model => {
            const isSelected = model === modelId;

            return (
              <Chip
                key={model}
                label={model}
                onClick={() => setModelId(model)}
                variant="outlined"
                className={isSelected ? 'selected-model' : undefined}
                sx={theme => ({
                  cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: 'transparent',
                  color: theme.palette.text.primary,
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.15s ease',

                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                  },
                  '&.selected-model, &.selected-model:hover': {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                  },
                })}
              />
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
};
