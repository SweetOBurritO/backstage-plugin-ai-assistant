import { SyntheticEvent, useEffect, useMemo, useState } from 'react';
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
    loading,
    error,
    value: userTools,
  } = useAsync(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${baseUrl}/chat/tools`);

    const { tools } = (await response.json()) as {
      tools: Required<UserTool>[];
    };

    return tools;
  }, []);

  const providers = useMemo(() => {
    if (loading || error || !userTools) {
      return [];
    }
    return userTools
      .map(tool => tool.provider)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [userTools, error, loading]);

  const [enabledTools, setEnabledTools] = useState<string[]>(() => {
    const stored = localStorage.getItem('ai-assistant.user-tools');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(
      'ai-assistant.user-tools',
      JSON.stringify(enabledTools),
    );
  }, [enabledTools]);

  const [expanded, setExpanded] = useState<string | false>('panel1');

  if (loading) {
    return <Alert severity="info">Loading Tool configurations...</Alert>;
  }

  const handleChange =
    (panel: string) => (_event: SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load Tool configurations. Please try refreshing the page.
        Alternatively, please validate your MCP server configurations.
      </Alert>
    );
  }

  if (!providers.length) {
    return <Alert severity="info">No tools available.</Alert>;
  }

  const handleProviderClick = (provider: string, checked: boolean) => {
    const providerTools = userTools!
      .filter(tool => tool.provider === provider)
      .map(tool => tool.name);

    setEnabledTools(current => {
      if (checked) {
        return Array.from(new Set([...current!, ...providerTools]));
      }

      return current!.filter(tool => !providerTools.includes(tool));
    });
  };

  const handleToolClick = (toolName: string, checked: boolean) => {
    setEnabledTools(current => {
      if (checked) {
        return Array.from(new Set([...(current! || []), toolName]));
      }
      return current!.filter(tool => tool !== toolName);
    });
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
                checked={userTools!
                  .filter(tool => tool.provider === provider)
                  .every(tool => enabledTools?.includes(tool.name))}
              />
              {userTools!
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
