import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { qetaAIExtensionPoint } from '@drodil/backstage-plugin-qeta-node';
import { createQetaAiHandler } from './services/ai-handler';
import { aiAssistantServiceRef } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export const qetaModuleAiAssistant = createBackendModule({
  pluginId: 'qeta',
  moduleId: 'ai-assistant',
  register(reg) {
    reg.registerInit({
      deps: {
        qetaAi: qetaAIExtensionPoint,
        aiAssistant: aiAssistantServiceRef,
        auth: coreServices.auth,
      },
      async init(options) {
        const { qetaAi, ...rest } = options;
        qetaAi.setAIHandler(createQetaAiHandler(rest));
      },
    });
  },
});
