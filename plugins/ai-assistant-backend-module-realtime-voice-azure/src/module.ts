import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { AzureRealtimeService } from './service';
import { createRealtimeRouter } from './router';
import { realtimeVoiceExtensionPoint } from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

export const aiAssistantModuleRealtimeVoiceAzure = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'realtime-voice-azure',
  register(reg) {
    reg.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        realtimeVoice: realtimeVoiceExtensionPoint,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        catalog: catalogServiceRef,
        cache: coreServices.cache,
        auth: coreServices.auth,
      },
      async init({
        config,
        logger,
        httpRouter,
        realtimeVoice,
        httpAuth,
        userInfo,
        catalog,
        cache,
        auth,
      }) {
        // Read configuration
        const realtimeConfig = config.getOptionalConfig(
          'aiAssistant.realtimeVoice.azureOpenAi',
        );

        if (!realtimeConfig) {
          logger.warn(
            'Azure OpenAI Realtime voice configuration not found. Skipping module initialization.',
          );
          return;
        }

        const apiKey = realtimeConfig.getString('apiKey');
        const endpoint = realtimeConfig.getString('endpoint');
        const deploymentName = realtimeConfig.getString('deploymentName');
        const apiVersion = realtimeConfig.getOptionalString('apiVersion');

        logger.info('Initializing Azure OpenAI Realtime voice module', {
          endpoint,
          deployment: deploymentName,
        });

        // Create service
        const realtimeService = new AzureRealtimeService(
          {
            apiKey,
            endpoint,
            deploymentName,
            apiVersion,
          },
          logger,
        );

        // Register service with the extension point to receive tools
        realtimeVoice.register(realtimeService);

        // Create and register router with all required services
        const router = createRealtimeRouter({
          logger,
          realtimeService,
          httpAuth,
          userInfo,
          catalog,
          cache,
          auth,
        });

        httpRouter.use(router);

        logger.info(
          'Azure OpenAI Realtime voice module initialized successfully',
        );
      },
    });
  },
});
