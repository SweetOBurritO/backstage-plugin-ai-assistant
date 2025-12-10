import {
  EnabledTool,
  Tool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export const toolFilter = (
  t: Tool,
  enabledTools: EnabledTool[] | undefined,
): boolean => {
  if (enabledTools === undefined) return true;

  // If empty array, no tools should be enabled
  if (enabledTools.length === 0) return false;
  // Otherwise, only allow tools that are in the enabled list
  const enabled = enabledTools.find(
    enabledTool =>
      enabledTool.name === t.name && enabledTool.provider === t.provider,
  );
  return !!enabled;
};
