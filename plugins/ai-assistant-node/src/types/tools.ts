import { z, ZodType } from 'zod';

export type Tool<T extends ZodType<any, any, any> = ZodType<any, any, any>> = {
  name: string;
  description: string;
  schema: T;
  func: (params: z.infer<T>) => Promise<string>;
};
