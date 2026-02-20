import express from 'express';
import Router from 'express-promise-router';
import { ChatService } from '../chat';
import z from 'zod';
import { validation } from './middleware/validation';
import { v4 as uuid } from 'uuid';
import {
  HttpAuthService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { ConversationService } from '../conversation';

export type ChatRouterOptions = {
  chat: ChatService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  conversation: ConversationService;
};

export async function createChatRouter(
  options: ChatRouterOptions,
): Promise<express.Router> {
  const { chat, httpAuth, userInfo, conversation } = options;

  const router = Router();

  const messageSchema = z.object({
    messages: z.array(
      z.object({
        id: z.uuid().optional().default(uuid),
        role: z.string(),
        content: z.string(),
      }),
    ),
    modelId: z.string(),
    conversationId: z.uuid().optional().default(uuid),
    stream: z.boolean().optional(),
    tools: z
      .array(
        z.object({
          name: z.string(),
          provider: z.string(),
        }),
      )
      .optional(),
  });

  router.post(
    '/message',
    validation(messageSchema, 'body'),
    async (req, res) => {
      const { messages, conversationId, modelId, stream, tools } = req.body;

      const credentials = await httpAuth.credentials(req);

      const responseMessages = await chat.prompt({
        modelId,
        messages,
        conversationId,
        stream,
        credentials,
        tools,
      });

      res.json({
        messages: responseMessages,
        conversationId,
      });
    },
  );

  const chatSchema = z.object({
    id: z.uuid(),
  });

  router.get('/conversations', async (req, res) => {
    const credentials = await httpAuth.credentials(req);
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const conversations = await conversation.getConversations({
      userEntityRef,
    });

    res.json({ conversations });
  });

  router.get('/:id', validation(chatSchema, 'params'), async (req, res) => {
    const { id } = req.params;

    const credentials = await httpAuth.credentials(req);
    const { userEntityRef } = await userInfo.getUserInfo(credentials);

    const conversationMessages = await conversation.getConversation({
      conversationId: id,
      userEntityRef,
    });

    res.json({ conversation: conversationMessages });
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

      await conversation.scoreMessage(messageId, score);

      res.status(204).end();
    },
  );

  router.post(
    '/share/:id',
    validation(chatSchema, 'params'),
    async (req, res) => {
      const { id } = req.params;

      const credentials = await httpAuth.credentials(req);
      const { userEntityRef } = await userInfo.getUserInfo(credentials);

      const shareId = await conversation.createConversationShare({
        conversationId: id,
        userEntityRef,
      });

      res.json({ shareId });
    },
  );

  router.post(
    '/share/:shareId/import',
    validation(
      z.object({
        shareId: z.uuid(),
      }),
      'params',
    ),
    async (req, res) => {
      const { shareId } = req.params;

      const credentials = await httpAuth.credentials(req);
      const { userEntityRef } = await userInfo.getUserInfo(credentials);

      const conversationId = await conversation.importSharedConversation({
        shareId,
        userEntityRef,
      });

      res.json({ conversationId });
    },
  );

  return router;
}
