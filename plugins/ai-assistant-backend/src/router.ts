import express from 'express';
import Router from 'express-promise-router';

export async function createRouter(): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}
