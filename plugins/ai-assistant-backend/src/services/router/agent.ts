import express from 'express';
import Router from 'express-promise-router';
import z from 'zod';
import { validation } from './middleware/validation';
import { v4 as uuid } from 'uuid';

import { AgentService } from '../agent';
import { HttpAuthService } from '@backstage/backend-plugin-api';

export type AgentRouterOptions = {
  agent: AgentService;
  httpAuth: HttpAuthService;
};

export async function createAgentRouter(
  options: AgentRouterOptions,
): Promise<express.Router> {
  const { agent, httpAuth } = options;

  const router = Router();

  const messageSchema = z.object({
    modelId: z.string().optional(),
    systemPrompt: z.string().optional(),
    context: z.string().optional(),

    messages: z.array(
      z.object({
        id: z.uuid().optional().default(uuid),
        role: z.string(),
        content: z.string(),
      }),
    ),

    tools: z
      .array(
        z.object({
          name: z.string(),
          provider: z.string(),
        }),
      )
      .optional(),

    metadata: z.object({
      runName: z.string(),
      runId: z.uuid().optional().default(uuid),
      userId: z.string(),
    }),
  });

  router.post(
    '/prompt',
    validation(messageSchema, 'body'),
    async (req, res) => {
      const { messages, modelId, tools, systemPrompt, metadata, context } =
        req.body;

      const credentials = await httpAuth.credentials(req);

      const responseMessages = await agent.prompt({
        messages,
        modelId,
        credentials,
        systemPrompt,
        tools,
        context,
        metadata: {
          runName: metadata.runName,
          userId: metadata.userId,
          conversationId: 'system:agent-prompt',
          runId: metadata.runId,
        },
      });

      res.json({
        messages: responseMessages,
      });
    },
  );

  return router;
}
