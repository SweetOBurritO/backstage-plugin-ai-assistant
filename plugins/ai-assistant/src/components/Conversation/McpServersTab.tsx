import { useState, useCallback, useRef } from 'react';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';
import { useAsync, useAsyncFn } from 'react-use';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { McpServerConfig } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { mcpApiRef } from '../../api/mcp';

interface McpConfigFormData {
  name: string;
  options: string;
}

interface McpServersTabProps {}

export const McpServersTab: React.FC<McpServersTabProps> = () => {
  const mcpApi = useApi(mcpApiRef);
  const alertApi = useApi(alertApiRef);

  const [configs, setConfigs] = useState<string[]>([]);

  // Fetch configs using useAsync hook
  const { loading, error: fetchError } = useAsync(async () => {
    try {
      const mcpConfigs = await mcpApi.getUserDefinedMcpConfigs();

      setConfigs(mcpConfigs.names);
    } catch (error) {
      alertApi.post({
        message: 'Failed to fetch MCP configurations',
        display: 'transient',
        severity: 'error',
      });
      throw error;
    }
  }, [mcpApi]);

  const [currentConfig, setCurrentConfig] = useState<McpConfigFormData>({
    name: '',
    options: JSON.stringify({}, null, 2),
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const jsonConfigRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback(() => {
    setCurrentConfig({
      name: '',
      options: JSON.stringify({}, null, 2),
    });
    setEditingIndex(null);
    setError('');
  }, []);

  const validateConfig = (config: McpConfigFormData): boolean => {
    if (!config.name.trim()) {
      setError('Server name is required');
      return false;
    }

    try {
      const parsedConfig = JSON.parse(config.options);

      if (
        Object.keys(parsedConfig).length === 0 &&
        parsedConfig.constructor === Object
      ) {
        setError('Server configuration cannot be empty');
        return false;
      }
    } catch (e) {
      setError('Invalid JSON configuration. Please check your syntax.');
      return false;
    }

    // Check for duplicate names (excluding current editing item)
    const isDuplicate = configs.some(
      (c, index) => c === config.name.trim() && index !== editingIndex,
    );

    if (isDuplicate) {
      setError('Server name must be unique');
      return false;
    }

    setError('');
    return true;
  };

  const [{ loading: saving }, handleAddConfig] = useAsyncFn(async () => {
    if (!validateConfig(currentConfig)) return;

    try {
      const parsedOptions = JSON.parse(currentConfig.options);

      const newConfig: McpServerConfig = {
        name: currentConfig.name.trim(),
        options: parsedOptions,
      };

      if (editingIndex !== null) {
        // Update existing config
        await mcpApi.updateMcpConfig(newConfig);
        const updated = [...configs];
        updated[editingIndex] = newConfig.name;
        setConfigs(updated);
      } else {
        // Create new config
        await mcpApi.createMcpConfig(newConfig);
        setConfigs([...configs, newConfig.name]);
      }

      resetForm();

      alertApi.post({
        message: `MCP server "${newConfig.name}" ${
          editingIndex !== null ? 'updated' : 'created'
        } successfully`,
        display: 'transient',
      });
    } catch (err) {
      setError(
        `Failed to ${
          editingIndex !== null ? 'update' : 'create'
        } MCP configuration. Please try again.`,
      );
      alertApi.post({
        message: (err as Error).message,
        display: 'transient',
        severity: 'error',
      });
    }
  }, [currentConfig, editingIndex, configs, mcpApi, validateConfig, resetForm]);

  const handleEditConfig = (index: number) => {
    const config = configs[index];

    setCurrentConfig({
      name: config,
      options: JSON.stringify({}, null, 2),
    });
    setEditingIndex(index);

    // Smooth scroll to form and focus the JSON config field after a short delay
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Focus after scrolling is initiated
      setTimeout(() => {
        jsonConfigRef.current?.focus();
      }, 300);
    }, 100);
  };

  const [{ loading: deleting }, handleDeleteConfig] = useAsyncFn(
    async (index: number) => {
      const configToDelete = configs[index];

      try {
        await mcpApi.deleteMcpConfig(configToDelete);
        const updated = configs.filter((_, i) => i !== index);
        setConfigs(updated);

        if (editingIndex === index) {
          resetForm();
        }

        alertApi.post({
          message: `MCP server "${configToDelete}" deleted successfully`,
          display: 'transient',
          severity: 'info',
        });
      } catch (err) {
        alertApi.post({
          message: `Failed to delete MCP server "${configToDelete}". Please try again.`,
          display: 'transient',
          severity: 'error',
        });
      }
    },
    [configs, editingIndex, mcpApi, alertApi, resetForm],
  );

  if (loading) {
    return (
      <Stack spacing={3}>
        <Typography variant="h6">
          Model Context Protocol (MCP) Servers
        </Typography>
        <Alert severity="info">Loading MCP server configurations...</Alert>
      </Stack>
    );
  }

  if (fetchError) {
    return (
      <Stack spacing={3}>
        <Typography variant="h6">
          Model Context Protocol (MCP) Servers
        </Typography>
        <Alert severity="error">
          Failed to load MCP server configurations. Please try refreshing the
          page.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h6">Model Context Protocol (MCP) Servers</Typography>
      <Typography variant="body2" color="text.secondary">
        Configure MCP servers to extend the AI assistant with additional tools
        and capabilities.
      </Typography>

      {/* Add/Edit Configuration Form */}
      <Paper variant="outlined" sx={{ p: 3 }} ref={formRef}>
        <Typography variant="subtitle1" gutterBottom>
          {editingIndex !== null ? 'Edit Server' : 'Add New Server'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            label="Server Name"
            fullWidth
            value={currentConfig.name}
            disabled={editingIndex !== null}
            onChange={e =>
              setCurrentConfig({
                ...currentConfig,
                name: e.target.value,
              })
            }
            placeholder="my-mcp-server"
            required
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Server Configuration
            </Typography>

            {editingIndex !== null && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Please re-enter the full JSON configuration below to update
                  it. Existing configurations cannot be edited directly for
                  security reasons.
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Define your MCP server configuration as JSON. This is similar to
              how VS Code MCP extensions are configured.
            </Typography>
            <TextField
              multiline
              rows={12}
              fullWidth
              value={currentConfig.options}
              onChange={e =>
                setCurrentConfig({
                  ...currentConfig,
                  options: e.target.value,
                })
              }
              placeholder="Enter JSON configuration..."
              inputRef={jsonConfigRef}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'Consolas, "Courier New", monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={resetForm}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAddConfig}
              disabled={!currentConfig.name.trim() || saving}
            >
              {(() => {
                if (saving) {
                  return editingIndex !== null ? 'Updating...' : 'Adding...';
                }
                return editingIndex !== null ? 'Update Server' : 'Add Server';
              })()}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Divider />

      {/* Existing Configurations */}
      <Stack spacing={2}>
        <Typography variant="subtitle1">Configured Servers</Typography>
        {configs.length === 0 ? (
          <Alert severity="info">
            No MCP servers configured. Add one above to get started.
          </Alert>
        ) : (
          configs.map((config, index) => (
            <Card key={index} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle2">{config}</Typography>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleEditConfig(index)}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteConfig(index)}
                      disabled={deleting}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
};
