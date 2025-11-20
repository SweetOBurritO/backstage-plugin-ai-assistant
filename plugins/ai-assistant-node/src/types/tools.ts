import { z, ZodType } from 'zod';
import { JsonObject } from '@sweetoburrito/backstage-plugin-ai-assistant-common';

export type Tool<T extends ZodType<any, any, any> = ZodType<any, any, any>> = {
  name: string;
  description: string;
  schema: T;
  func: (params: z.infer<T>) => Promise<{
    content: string;
    metadata?: JsonObject;
  }>;
};
