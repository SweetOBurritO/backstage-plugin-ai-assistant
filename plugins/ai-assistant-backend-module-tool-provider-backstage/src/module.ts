import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import type { JsonObject } from '@backstage/types';
import { actionsServiceRef } from '@backstage/backend-plugin-api/alpha';
import {
  toolExtensionPoint,
  createAssistantTool,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';

export const aiAssistantModuleToolProviderBackstage = createBackendModule({
  pluginId: 'ai-assistant',
  moduleId: 'tool-provider-backstage',
  register(reg) {
    reg.registerInit({
      deps: {
        actionsService: actionsServiceRef,
        auth: coreServices.auth,
        toolExtension: toolExtensionPoint,
      },
      async init({ actionsService, auth, toolExtension }) {
        const credentials = await auth.getOwnServiceCredentials();

        const { actions } = await actionsService.list({
          credentials,
        });

        actions.forEach(action => {
          const tool = createAssistantTool({
            tool: {
              name: action.name,
              description: action.description,
              schema: jsonSchemaToZod(action.schema.input),
              provider: 'backstage',
              func: async params => {
                const callCredentials = await auth.getOwnServiceCredentials();

                const { output } = await actionsService.invoke({
                  id: action.id,
                  credentials: callCredentials,
                  input: params as JsonObject,
                });

                const content = JSON.stringify(output);

                return {
                  content,
                };
              },
            },
          });
          toolExtension.register(tool);
        });
      },
    });
  },
});
