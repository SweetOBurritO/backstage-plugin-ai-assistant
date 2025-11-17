import express from 'express';
import Router from 'express-promise-router';
import { SummarizerService } from '../summarizer';
import { validation } from './middleware/validation';
import z from 'zod';

export type ModelRouterOptions = {
  summarizer: SummarizerService;
};

export async function createModelRouter(
  options: ModelRouterOptions,
): Promise<express.Router> {
  const { summarizer } = options;
  const router = Router();

  const contentSchema = z.object({
    content: z.string(),
    length: z.string().optional(),
  });

  router.post(
    '/content',
    validation(contentSchema, 'body'),
    async (req, res) => {
      const { content, length } = req.body;
      const summary = await summarizer.summarize({
        content,
        length,
      });
      res.json({ summary });
    },
  );

  const conversationSchema = z.object({
    messages: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    ),
    length: z.string().optional(),
  });

  router.post(
    '/conversation',
    validation(conversationSchema, 'body'),
    async (req, res) => {
      const { messages, length } = req.body;
      const summary = await summarizer.summarizeConversation({
        messages,
        length,
      });
      res.json({ summary });
    },
  );

  return router;
}
