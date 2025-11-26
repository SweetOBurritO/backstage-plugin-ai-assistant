import { SyntheticEvent, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import {
  fetchApiRef,
  useApi,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import {
  EnabledTool,
  UserTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
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
import { useChatSettings } from '../../../../hooks';

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
  const { toolsEnabled, setToolsEnabled } = useChatSettings();

  const {
    loading: availableUserToolsLoading,
    error: availableUserToolsError,
    value: availableUserTools,
  } = useAsync(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('ai-assistant');

    const response = await fetchApi.fetch(`${baseUrl}/chat/tools`);

    const { tools } = (await response.json()) as {
      tools: UserTool[];
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

  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange =
    (panel: string) => (_event: SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

  const handleProviderClick = (provider: string, checked: boolean) => {
    if (!availableUserTools) {
      return;
    }
    const providerTools: EnabledTool[] = availableUserTools
      .filter(tool => tool.provider === provider)
      .map(tool => ({ name: tool.name, provider: tool.provider }));

    if (checked) {
      const combined = [...toolsEnabled, ...providerTools];
      const unique = Array.from(
        new Map(combined.map(tool => [JSON.stringify(tool), tool])).values(),
      );
      setToolsEnabled(unique);
      return;
    }

    const providerToolStrings = new Set(
      providerTools.map(t => JSON.stringify(t)),
    );
    setToolsEnabled(
      toolsEnabled.filter(
        tool => !providerToolStrings.has(JSON.stringify(tool)),
      ),
    );
  };

  const handleToolClick = (tool: UserTool, checked: boolean) => {
    if (checked) {
      const toolMap = new Map(
        [...toolsEnabled, { name: tool.name, provider: tool.provider }].map(
          t => [`${t.provider}-${t.name}`, t],
        ),
      );
      setToolsEnabled(Array.from(toolMap.values()));
      return;
    }

    setToolsEnabled(
      toolsEnabled.filter(
        t => !(t.name === tool.name && t.provider === tool.provider),
      ),
    );
  };

  if (availableUserToolsLoading) {
    return <Alert severity="info">Loading Tool configurations...</Alert>;
  }

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

  return (
    <div>
      {providers.map(provider => (
        <Accordion
          key={provider}
          expanded={expanded === provider}
          onChange={handleChange(provider)}
        >
          <AccordionSummary>
            <Typography component="span">{provider}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox />}
                label="All"
                onChange={(_e, checked) =>
                  handleProviderClick(provider, checked)
                }
                checked={availableUserTools!
                  .filter(tool => tool.provider === provider)
                  .every(tool =>
                    toolsEnabled?.some(
                      t => t.name === tool.name && t.provider === tool.provider,
                    ),
                  )}
              />
              {availableUserTools!
                .filter(tool => tool.provider === provider)
                .map(tool => (
                  <Tooltip title={tool.description} key={tool.name} arrow>
                    <FormControlLabel
                      control={<Checkbox />}
                      label={tool.name}
                      checked={
                        toolsEnabled?.some(
                          t =>
                            t.name === tool.name &&
                            t.provider === tool.provider,
                        ) || false
                      }
                      onChange={(_e, checked) => handleToolClick(tool, checked)}
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
