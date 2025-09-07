import express from 'express';
import Router from 'express-promise-router';
import { ChatService } from '../chat';

export type ModelRouterOptions = {
  chat: ChatService;
};

export async function createModelRouter(
  options: ModelRouterOptions,
): Promise<express.Router> {
  const { chat } = options;
  const router = Router();

  router.get('/', async (_req, res) => {
    const models = await chat.getAvailableModels();
    res.json({ models });
  });

  return router;
}
