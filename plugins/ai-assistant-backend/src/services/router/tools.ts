import express from 'express';
import Router from 'express-promise-router';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { ToolsService } from '../tools';

export type ToolRouterOptions = {
  httpAuth: HttpAuthService;
  tool: ToolsService;
};

export async function createToolRouter(
  options: ToolRouterOptions,
): Promise<express.Router> {
  const { httpAuth, tool } = options;
  const router = Router();

  router.get('/', async (req, res) => {
    const credentials = await httpAuth.credentials(req);

    const tools = await tool.getAvailableUserTools({ credentials });

    res.json({ tools });
  });

  return router;
}
