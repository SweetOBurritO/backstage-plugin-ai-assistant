import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './services/router';
import {
  dataIngestorExtensionPoint,
  EmbeddingsProvider,
  embeddingsProviderExtensionPoint,
  Ingestor,
  Model,
  modelProviderExtensionPoint,
  Tool,
  toolExtensionPoint,
  callbackProviderExtensionPoint,
  CallbackProvider,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createDataIngestionPipeline } from './services/ingestor';
import { createChatService } from './services/chat';
import { applyDatabaseMigrations } from './database/migrations';
import { PgVectorStore } from './database';
import { signalsServiceRef } from '@backstage/plugin-signals-node';
import { createSearchKnowledgeTool } from './services/tools/searchKnowledge';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createMcpService } from './services/mcp';
import { createCallbackService } from './services/callbacks';
import { createSummarizerService } from './services/summarizer';
/**
 * aiAssistantPlugin backend plugin
 *
 * @public
 */

export const aiAssistantPlugin = createBackendPlugin({
  pluginId: 'ai-assistant',
  register(env) {
    const ingestors: Ingestor[] = [];
    const models: Model[] = [];
    const tools: Tool[] = [];
    const callbacks: CallbackProvider[] = [];

    let embeddingsProvider: EmbeddingsProvider;

    env.registerExtensionPoint(dataIngestorExtensionPoint, {
      registerIngestor: ingestor => {
        const existingIngestor = ingestors.find(i => i.id === ingestor.id);
        if (existingIngestor) {
          throw new Error(
            `Ingestor with id ${ingestor.id} is already registered.`,
          );
        }
        ingestors.push(ingestor);
      },
    });

    env.registerExtensionPoint(embeddingsProviderExtensionPoint, {
      register: provider => {
        embeddingsProvider = provider;
      },
    });

    env.registerExtensionPoint(modelProviderExtensionPoint, {
      register: model => {
        const existingModel = models.find(m => m.id === model.id);
        if (existingModel) {
          throw new Error(`Model with id ${model.id} is already registered.`);
        }
        models.push(model);
      },
    });

    env.registerExtensionPoint(toolExtensionPoint, {
      register: tool => {
        const existingTool = tools.find(t => t.name === tool.name);
        if (existingTool) {
          throw new Error(`Tool with name ${tool.name} is already registered.`);
        }
        tools.push(tool);
      },
    });

    env.registerExtensionPoint(callbackProviderExtensionPoint, {
      register: callbackProvider => {
        callbacks.push(callbackProvider);
      },
    });

    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        signals: signalsServiceRef,
        catalog: catalogServiceRef,
        cache: coreServices.cache,
        auth: coreServices.auth,
      },

      async init(options) {
        const { httpRouter, database, config } = options;

        const client = await database.getClient();

        await applyDatabaseMigrations(client);

        const vectorStore = await PgVectorStore.fromConfig(options);

        if (!embeddingsProvider) {
          throw new Error('No Embeddings Provider was registered.');
        }

        vectorStore.connectEmbeddings(await embeddingsProvider.getEmbeddings());

        const dataIngestionPipeline = createDataIngestionPipeline({
          ...options,
          vectorStore,
          ingestors,
        });

        const mcp = await createMcpService(options);

        const searchKnowledgeTool = createSearchKnowledgeTool({ vectorStore });
        tools.push(searchKnowledgeTool);

        const callback = await createCallbackService({
          callbacks,
        });

        const summarizer = await createSummarizerService({
          config,
          models,
          callback,
        });

        const chat = await createChatService({
          ...options,
          models,
          tools,
          mcp,
          callback,
          summarizer,
        });

        httpRouter.use(
          await createRouter({ ...options, chat, mcp, summarizer }),
        );
        dataIngestionPipeline.start();
      },
    });
  },
});
