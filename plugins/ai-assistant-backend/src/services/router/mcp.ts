import express from 'express';
import Router from 'express-promise-router';
import { McpService } from '../mcp';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import z from 'zod';
import { validation } from './middleware/validation';

export type McpRouterOptions = {
  mcp: McpService;
  httpAuth: HttpAuthService;
};

export async function createMcpRouter(
  options: McpRouterOptions,
): Promise<express.Router> {
  const { mcp, httpAuth } = options;
  const router = Router();

  router.get('/config', async (req, res) => {
    const credentials = await httpAuth.credentials(req);

    const names = await mcp.getUserMcpServerConfigNames(credentials);

    res.json({
      names,
    });
  });

  const configSchema = z.object({
    name: z.string(),
    options: z.record(z.string(), z.any()),
  });

  router.post('/config', validation(configSchema, 'body'), async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const { name, options: mcpOptions } = req.body;

    await mcp.createUserMcpServerConfig(credentials, {
      name,
      options: mcpOptions,
    });

    res.status(201).send();
  });

  router.patch(
    '/config',
    validation(configSchema, 'body'),
    async (req, res) => {
      const credentials = await httpAuth.credentials(req);
      const { name, options: mcpOptions } = req.body;

      await mcp.updateUserMcpServerConfig(credentials, {
        name,
        options: mcpOptions,
      });

      res.status(204).send();
    },
  );

  const deleteConfigSchema = z.object({
    name: z.string(),
  });

  router.delete(
    '/config',
    validation(deleteConfigSchema, 'body'),
    async (req, res) => {
      const credentials = await httpAuth.credentials(req);
      const { name } = req.body;

      await mcp.deleteUserMcpServerConfig(credentials, name);

      res.status(204).send();
    },
  );

  return router;
}
