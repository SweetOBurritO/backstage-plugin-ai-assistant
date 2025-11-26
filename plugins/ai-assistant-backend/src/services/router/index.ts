import express from 'express';
import Router from 'express-promise-router';
import { createChatRouter, ChatRouterOptions } from './chat';
import { createModelRouter, ModelRouterOptions } from './models';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { SummaryRouterOptions, createSummaryRouter } from './summary';
import { createSettingsRouter, SettingsRouterOptions } from './settings';

export type RouterOptions = ChatRouterOptions &
  SummaryRouterOptions &
  ModelRouterOptions &
  SettingsRouterOptions & {
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
  router.use('/summary', await createSummaryRouter(options));
  router.use('/settings', await createSettingsRouter(options));

  const middleware = MiddlewareFactory.create(options);

  router.use(middleware.error());

  return router;
}
