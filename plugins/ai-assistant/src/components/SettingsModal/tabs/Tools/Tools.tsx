import {
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAsync } from 'react-use';
import {
  fetchApiRef,
  useApi,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { UserTool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import Alert from '@mui/material/Alert';

import { styled } from '@mui/material/styles';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, {
  AccordionSummaryProps,
  accordionSummaryClasses,
} from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';

const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem', ml: 1 }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, .03)',
  flexDirection: 'row-reverse',
  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
    {
      transform: 'rotate(90deg)',
    },
  [`& .${accordionSummaryClasses.content}`]: {
    marginLeft: theme.spacing(1),
  },
  ...theme.applyStyles('dark', {
    backgroundColor: 'rgba(255, 255, 255, .05)',
  }),
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const Tab = () => {
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  const {
    loading: availableUserToolsLoading,
    error: availableUserToolsError,
    value: availableUserTools,
  } = useAsync(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${baseUrl}/chat/tools`);

    const { tools } = (await response.json()) as {
      tools: Required<UserTool>[];
    };

    return tools;
  }, [discoveryApi, fetchApi]);

  const {
    loading: userEnabledToolsLoading,
    error: userEnabledToolsError,
    value: userEnabledTools,
  } = useAsync(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const query = new URLSearchParams({
      type: 'user-tools',
    });

    const response = await fetchApi.fetch(
      `${baseUrl}/settings?${query.toString()}`,
    );

    const {
      settings: { tools },
    } = (await response.json()) as {
      settings: { tools: string[] };
    };

    return tools;
  }, [discoveryApi, fetchApi]);

  const providers = useMemo(() => {
    if (
      availableUserToolsLoading ||
      availableUserToolsError ||
      !availableUserTools
    ) {
      return [];
    }
    return availableUserTools
      .map(tool => tool.provider)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [availableUserTools, availableUserToolsError, availableUserToolsLoading]);

  const [enabledTools, setEnabledTools] = useState<string[]>([]);

  useEffect(() => {
    if (userEnabledToolsLoading || userEnabledToolsError || !userEnabledTools) {
      return;
    }

    setEnabledTools(userEnabledTools);
  }, [userEnabledTools, userEnabledToolsError, userEnabledToolsLoading]);

  const setEnabledToolsCallback = useCallback(
    async (tools: string[]) => {
      setEnabledTools(tools);

      const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

      await fetchApi.fetch(`${baseUrl}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ type: 'user-tools', settings: { tools } }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    [discoveryApi, fetchApi],
  );

  useEffect(() => {
    localStorage.setItem(
      'ai-assistant.user-tools',
      JSON.stringify(enabledTools),
    );
  }, [enabledTools]);

  const [expanded, setExpanded] = useState<string | false>('panel1');

  if (availableUserToolsLoading) {
    return <Alert severity="info">Loading Tool configurations...</Alert>;
  }

  const handleChange =
    (panel: string) => (_event: SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

  if (availableUserToolsError) {
    return (
      <Alert severity="error">
        Failed to load Tool configurations. Please try refreshing the page.
      </Alert>
    );
  }

  if (!providers.length) {
    return <Alert severity="info">No tools available.</Alert>;
  }

  const handleProviderClick = (provider: string, checked: boolean) => {
    const providerTools = availableUserTools!
      .filter(tool => tool.provider === provider)
      .map(tool => tool.name);

    if (checked) {
      setEnabledToolsCallback(
        Array.from(new Set([...enabledTools!, ...providerTools])),
      );
      return;
    }

    setEnabledToolsCallback(
      enabledTools!.filter(tool => !providerTools.includes(tool)),
    );
  };

  const handleToolClick = (toolName: string, checked: boolean) => {
    if (checked) {
      setEnabledToolsCallback(
        Array.from(new Set([...(enabledTools! || []), toolName])),
      );
      return;
    }

    setEnabledToolsCallback(enabledTools!.filter(tool => tool !== toolName));
  };

  return (
    <div>
      {providers.map(provider => (
        <Accordion
          key={provider}
          expanded={expanded === provider}
          onChange={handleChange(provider)}
        >
          <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
            <Typography component="span">{provider}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="All"
                onChange={(_e, checked) =>
                  handleProviderClick(provider, checked)
                }
                checked={availableUserTools!
                  .filter(tool => tool.provider === provider)
                  .every(tool => enabledTools?.includes(tool.name))}
              />
              {availableUserTools!
                .filter(tool => tool.provider === provider)
                .map(tool => (
                  <Tooltip title={tool.description} key={tool.name} arrow>
                    <FormControlLabel
                      control={<Checkbox />}
                      label={tool.name}
                      checked={enabledTools?.includes(tool.name) || false}
                      onChange={(_e, checked) =>
                        handleToolClick(tool.name, checked)
                      }
                    />
                  </Tooltip>
                ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
};
