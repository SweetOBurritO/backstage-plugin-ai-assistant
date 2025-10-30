import express from 'express';
import Router from 'express-promise-router';
import { createChatRouter, ChatRouterOptions } from './chat';
import { createModelRouter } from './models';
import { createPageSummaryRouter } from './page-summary';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export type RouterOptions = ChatRouterOptions & {
  config: RootConfigService;
  logger: LoggerService;
  models: Model[];
  langfuseEnabled: boolean;
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.use('/chat', await createChatRouter(options));
  router.use('/models', await createModelRouter(options));
  router.use('/page-summary', await createPageSummaryRouter(options));

  const middleware = MiddlewareFactory.create(options);

  router.use(middleware.error());

  return router;
}
