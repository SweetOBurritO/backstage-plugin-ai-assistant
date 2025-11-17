import express from 'express';
import Router from 'express-promise-router';
import { createChatRouter, ChatRouterOptions } from './chat';
import { createModelRouter } from './models';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { createMcpRouter, McpRouterOptions } from './mcp';
import { SummaryRouterOptions, createSummaryRouter } from './summary';

export type RouterOptions = ChatRouterOptions &
  SummaryRouterOptions &
  McpRouterOptions & {
    config: RootConfigService;
    logger: LoggerService;
  };

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.use('/chat', await createChatRouter(options));
  router.use('/models', await createModelRouter(options));
  router.use('/mcp', await createMcpRouter(options));
  router.use('/summary', await createSummaryRouter(options));

  const middleware = MiddlewareFactory.create(options);

  router.use(middleware.error());

  return router;
}
