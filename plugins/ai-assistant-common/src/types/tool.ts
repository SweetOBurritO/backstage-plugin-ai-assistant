import { z, ZodType } from 'zod';
import { JsonObject } from './json';

export type Tool<T extends ZodType<any, any, any> = ZodType<any, any, any>> = {
  name: string;
  provider?: string;
  description: string;
  schema: T;
  func: (params: z.infer<T>) => Promise<{
    content: string;
    metadata?: JsonObject;
  }>;
};

export type UserTool = Pick<Tool, 'name' | 'provider' | 'description'>;
