import express from 'express';
import Router from 'express-promise-router';
import { ModelService } from '../model';

export type ModelRouterOptions = {
  model: ModelService;
};

export async function createModelRouter(
  options: ModelRouterOptions,
): Promise<express.Router> {
  const { model } = options;
  const router = Router();

  router.get('/', async (_req, res) => {
    const models = await model.getAvailableModels();
    res.json({ models });
  });

  return router;
}
