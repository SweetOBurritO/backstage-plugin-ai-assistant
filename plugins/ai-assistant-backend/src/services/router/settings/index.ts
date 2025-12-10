import express from 'express';
import Router from 'express-promise-router';

import { createMcpRouter, McpRouterOptions } from './mcp';
import { UserSettingsService } from '../../user-settings';
import z from 'zod';
import { validation } from '../middleware/validation';

export type SettingsRouterOptions = McpRouterOptions & {
  userSettings: UserSettingsService;
};

export async function createSettingsRouter(
  options: SettingsRouterOptions,
): Promise<express.Router> {
  const { userSettings, httpAuth } = options;
  const router = Router();
  router.use(express.json());

  router.use('/mcp', await createMcpRouter(options));

  const settingsSchema = z.object({
    type: z.string(),
  });

  router.get('/', validation(settingsSchema, 'query'), async (req, res) => {
    const credentials = await httpAuth.credentials(req);

    const { type } = req.query;

    const settings = await userSettings.getSettingsForType(
      credentials,
      type as string,
    );

    res.json({
      settings,
    });
  });

  const setSettingsSchema = z.object({
    type: z.string(),
    settings: z.any(),
  });

  router.patch('/', validation(setSettingsSchema, 'body'), async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const { type, settings } = req.body;

    await userSettings.setSettingsForType(credentials, type, settings);
    res.status(204).send();
  });

  return router;
}
