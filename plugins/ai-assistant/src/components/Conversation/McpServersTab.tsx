import { useState, useCallback, useRef } from 'react';
import { useApi, errorApiRef } from '@backstage/core-plugin-api';
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
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { McpServerConfig } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { mcpApiRef } from '../../api/mcp';

interface McpConfigFormData {
  name: string;
  jsonConfig: string;
}

interface McpServersTabProps {}

export const McpServersTab: React.FC<McpServersTabProps> = () => {
  const mcpApi = useApi(mcpApiRef);
  const errorApi = useApi(errorApiRef);

  const [configs, setConfigs] = useState<McpServerConfig[]>([]);

  // Fetch configs using useAsync hook
  const { loading, error: fetchError } = useAsync(async () => {
    try {
      await mcpApi.getUserDefinedMcpConfigs();
      // The API returns string[], but we need McpServerConfig[]
      // For now, we'll start with an empty array until the API is updated
      setConfigs([]);
    } catch (error) {
      errorApi.post({
        name: 'McpConfigFetchError',
        message: 'Failed to fetch MCP configurations',
      });
      throw error;
    }
  }, [mcpApi]);

  const [currentConfig, setCurrentConfig] = useState<McpConfigFormData>({
    name: '',
    jsonConfig: JSON.stringify(
      {
        command: 'node',
        args: ['path/to/server.js'],
        env: {},
        cwd: '',
        timeout: 30000,
      },
      null,
      2,
    ),
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const jsonConfigRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback(() => {
    setCurrentConfig({
      name: '',
      jsonConfig: JSON.stringify(
        {
          command: 'node',
          args: ['path/to/server.js'],
          env: {},
          cwd: '',
          timeout: 30000,
        },
        null,
        2,
      ),
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
      const parsedConfig = JSON.parse(config.jsonConfig);
      if (!parsedConfig.command || typeof parsedConfig.command !== 'string') {
        setError('Command is required in the configuration');
        return false;
      }
    } catch (e) {
      setError('Invalid JSON configuration. Please check your syntax.');
      return false;
    }

    // Check for duplicate names (excluding current editing item)
    const isDuplicate = configs.some(
      (c, index) => c.name === config.name.trim() && index !== editingIndex,
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
      const parsedOptions = JSON.parse(currentConfig.jsonConfig);

      const newConfig: McpServerConfig = {
        name: currentConfig.name.trim(),
        options: {
          command: parsedOptions.command.trim(),
          args: Array.isArray(parsedOptions.args)
            ? parsedOptions.args.filter((arg: string) => arg.trim())
            : [],
          env:
            parsedOptions.env && Object.keys(parsedOptions.env).length > 0
              ? parsedOptions.env
              : undefined,
          cwd: parsedOptions.cwd?.trim() || undefined,
          stderr: parsedOptions.stderr,
          timeout: parsedOptions.timeout || 30000,
        },
      };

      if (editingIndex !== null) {
        // Update existing config
        await mcpApi.updateMcpConfig(newConfig);
        const updated = [...configs];
        updated[editingIndex] = newConfig;
        setConfigs(updated);
      } else {
        // Create new config
        await mcpApi.createMcpConfig(newConfig);
        setConfigs([...configs, newConfig]);
      }

      resetForm();

      errorApi.post({
        name: 'McpConfigSuccess',
        message: `MCP server "${newConfig.name}" ${
          editingIndex !== null ? 'updated' : 'created'
        } successfully`,
      });
    } catch (err) {
      setError(
        `Failed to ${
          editingIndex !== null ? 'update' : 'create'
        } MCP configuration. Please try again.`,
      );
    }
  }, [
    currentConfig,
    editingIndex,
    configs,
    mcpApi,
    errorApi,
    validateConfig,
    resetForm,
  ]);

  const handleEditConfig = (index: number) => {
    const config = configs[index];
    const configObject = {
      command: config.options.command || '',
      args: config.options.args || [],
      env: config.options.env || {},
      cwd: config.options.cwd || '',
      stderr: config.options.stderr || false,
      timeout: config.options.timeout || 30000,
    };

    setCurrentConfig({
      name: config.name,
      jsonConfig: JSON.stringify(configObject, null, 2),
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
        await mcpApi.deleteMcpConfig(configToDelete.name);
        const updated = configs.filter((_, i) => i !== index);
        setConfigs(updated);

        if (editingIndex === index) {
          resetForm();
        }

        errorApi.post({
          name: 'McpConfigSuccess',
          message: `MCP server "${configToDelete.name}" deleted successfully`,
        });
      } catch (err) {
        errorApi.post({
          name: 'McpConfigError',
          message: `Failed to delete MCP server "${configToDelete.name}". Please try again.`,
        });
      }
    },
    [configs, editingIndex, mcpApi, errorApi, resetForm],
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

      {/* Existing Configurations */}
      <Stack spacing={2}>
        <Typography variant="subtitle1">Configured Servers</Typography>
        {configs.length === 0 ? (
          <Alert severity="info">
            No MCP servers configured. Add one below to get started.
          </Alert>
        ) : (
          configs.map((config, index) => (
            <Card key={index} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{config.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Command: {config.options.command}
                    </Typography>
                    {config.options.args && config.options.args.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          Args:
                        </Typography>
                        {config.options.args.map(
                          (arg: string, argIndex: number) => (
                            <Chip key={argIndex} label={arg} size="small" />
                          ),
                        )}
                      </Stack>
                    )}
                  </Stack>
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

      <Divider />

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
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Define your MCP server configuration as JSON. This is similar to
              how VS Code MCP extensions are configured.
            </Typography>
            <TextField
              multiline
              rows={12}
              fullWidth
              value={currentConfig.jsonConfig}
              onChange={e =>
                setCurrentConfig({
                  ...currentConfig,
                  jsonConfig: e.target.value,
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
              helperText="Example properties: command, args, env, cwd, timeout, stderr"
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
    </Stack>
  );
};
