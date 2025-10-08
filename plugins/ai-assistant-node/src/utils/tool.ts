import { ZodType } from 'zod';
import { Tool } from '../types';

type CreateAssistantToolOptions<T extends ZodType<any, any, any>> = {
  tool: Tool<T>;
};

export const createAssistantTool = <T extends ZodType<any, any, any>>(
  options: CreateAssistantToolOptions<T>,
) => {
  return options.tool;
};
