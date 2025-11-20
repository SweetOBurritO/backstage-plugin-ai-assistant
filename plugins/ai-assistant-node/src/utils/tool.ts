import { ZodType } from 'zod';
import { Tool } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

type CreateAssistantToolOptions<T extends ZodType<any, any, any>> = {
  tool: Tool<T>;
};

export const createAssistantTool = <T extends ZodType<any, any, any>>(
  options: CreateAssistantToolOptions<T>,
) => {
  return options.tool;
};
