import express from 'express';
import Router from 'express-promise-router';
import {
  AuthService,
  CacheService,
  HttpAuthService,
  LoggerService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { AzureRealtimeService } from './service';
import { InputError } from '@backstage/errors';
import { CatalogService } from '@backstage/plugin-catalog-node';

export interface RealtimeRouterOptions {
  logger: LoggerService;
  realtimeService: AzureRealtimeService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  catalog: CatalogService;
  cache: CacheService;
  auth: AuthService;
}

/**
 * Create router for realtime voice endpoints
 */
export function createRealtimeRouter(
  options: RealtimeRouterOptions,
): express.Router {
  const { logger, realtimeService, httpAuth, userInfo, catalog, auth } =
    options;
  const router = Router();

  // Add JSON body parser middleware
  router.use(express.json());

  /**
   * POST /realtime/session
   * Create a new realtime session and return ephemeral credentials
   */
  router.post('/realtime/session', async (req, res) => {
    try {
      const sessionConfig = req.body || {};

      // Validate optional configuration
      if (sessionConfig.voice) {
        const validVoices = ['alloy', 'echo', 'shimmer'];
        if (!validVoices.includes(sessionConfig.voice)) {
          throw new InputError(
            `Invalid voice: ${
              sessionConfig.voice
            }. Must be one of: ${validVoices.join(', ')}`,
          );
        }
      }

      // Create session with Azure OpenAI
      const session = await realtimeService.createSession(sessionConfig);
      const webrtcUrl = realtimeService.getWebRtcUrl();

      // Return session info to client
      res.json({
        sessionId: session.id,
        webrtcUrl,
        ephemeralKey: session.client_secret.value,
        expiresAt: session.client_secret.expires_at,
        model: session.model,
      });
    } catch (error: any) {
      logger.error('Error creating realtime session', { error });

      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Failed to create realtime session',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  /**
   * GET /realtime/tools
   * Get available tool schemas for the realtime session
   */
  router.get('/realtime/tools', async (_, res) => {
    try {
      const toolSchemas = realtimeService.getToolSchemas();
      res.json({ tools: toolSchemas });
    } catch (error: any) {
      logger.error('Error retrieving tool schemas', { error });
      res.status(500).json({
        error: 'Failed to retrieve tool schemas',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /realtime/tools/exec
   * Execute a tool by name with provided arguments
   * Body: { name: string, arguments: object }
   */
  router.post('/realtime/tools/exec', async (req, res) => {
    try {
      const { name, arguments: args } = req.body ?? {};

      if (!name) {
        throw new InputError('Tool name is required');
      }

      const output = await realtimeService.executeTool(name, args);

      res.json({ output });
    } catch (error: any) {
      logger.error('Error executing tool', { error });

      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
      } else if (error.message?.includes('Tool not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Tool execution failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  /**
   * GET /realtime/user
   * Get current user information
   */
  router.get('/realtime/user', async (req, res) => {
    try {
      // Get user information
      const credentials = await httpAuth.credentials(req);
      const currentUserInfo = await userInfo.getUserInfo(credentials);

      // Optionally fetch more details from catalog
      let displayName = currentUserInfo.userEntityRef;
      let email = '';

      try {
        const user = await catalog.getEntityByRef(
          currentUserInfo.userEntityRef,
          {
            credentials: await auth.getOwnServiceCredentials(),
          },
        );

        if (user) {
          displayName = user.metadata.name || currentUserInfo.userEntityRef;
          email = (user as any).spec?.profile?.email || '';
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to fetch detailed user info from catalog', {
          errorMsg,
        });
      }

      res.json({
        userEntityRef: currentUserInfo.userEntityRef,
        displayName,
        email,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error fetching user info', { errorMessage });
      res.status(500).json({
        error: 'Failed to fetch user info',
        details: errorMessage,
      });
    }
  });

  /**
   * GET /realtime/health
   * Health check endpoint
   */
  router.get('/realtime/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}
