import express from 'express';
import Router from 'express-promise-router';
import { ChatService } from '../chat';
import z from 'zod';
import { validation } from './middleware/validation';
import { v4 as uuid } from 'uuid';
import {
  DatabaseService,
  HttpAuthService,
  UserInfoService,
} from '@backstage/backend-plugin-api';

export type ChatRouterOptions = {
  chat: ChatService;
  database: DatabaseService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
};

export async function createChatRouter(
  options: ChatRouterOptions,
): Promise<express.Router> {
  const { chat, httpAuth, userInfo } = options;

  const router = Router();

  const messageSchema = z.object({
    messages: z.array(
      z.object({
        id: z.string().uuid().optional().default(uuid),
        role: z.string(),
        content: z.string(),
      }),
    ),
    modelId: z.string(),
    conversationId: z.string().uuid().optional().default(uuid),
    stream: z.boolean().optional(),
  });

  router.post(
    '/message',
    validation(messageSchema, 'body'),
    async (req, res) => {
      const { messages, conversationId, modelId, stream } = req.body;

      const credentials = await httpAuth.credentials(req);
      const { userEntityRef } = await userInfo.getUserInfo(credentials);

      const responseMessages = await chat.prompt({
        modelId,
        messages,
        conversationId,
        stream,
        userEntityRef,
      });

      res.json({
        messages: responseMessages,
        conversationId,
      });
    },
  );

  const chatSchema = z.object({
    id: z.string().uuid(),
  });

  router.get('/conversations', async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const conversations = await chat.getConversations({
      userEntityRef,
    });

    res.json({ conversations });
  });

  router.get('/:id', validation(chatSchema, 'params'), async (req, res) => {
    const { id } = req.params;

    const credentials = await httpAuth.credentials(req);
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const conversation = await chat.getConversation({
      conversationId: id,
      userEntityRef,
    });

    res.json({ conversation });
  });

  router.post(
    '/message/:messageId/score',
    validation(
      z.object({
        messageId: z.string().uuid(),
      }),
      'params',
    ),
    validation(
      z.object({
        score: z.number(),
      }),
      'body',
    ),
    async (req, res) => {
      const { messageId } = req.params;
      const { score } = req.body;

      await chat.scoreMessage(messageId, score);

      res.status(204).end();
    },
  );

  return router;
}
