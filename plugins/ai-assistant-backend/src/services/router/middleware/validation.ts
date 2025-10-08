import express from 'express';
import { ZodObject } from 'zod';

type ValidationKey = 'body' | 'query' | 'params' | 'headers';

export const validation = (schema: ZodObject, key: ValidationKey) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const parsed = schema.safeParse(req[key]);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        issue =>
          `Validation Error:Field ${issue.path.join('.')} - ${issue.message}`,
      );
      res.status(400).send({ errors });
      return;
    }
    req[key] = parsed.data;
    next();
  };
};
