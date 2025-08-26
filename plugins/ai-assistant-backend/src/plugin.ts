import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import {
  dataIngestorExtensionPoint,
  EmbeddingsProvider,
  embeddingsProviderExtensionPoint,
  Ingestor,
  Model,
  modelProviderExtensionPoint,
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createPgVectorStore } from './database';
import { createDataIngestionPipeline } from './services/ingestor';
import { createChatService } from './services/chat';
import { createPromptBuilder } from './services/prompt';

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

    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
      },

      async init(options) {
        const { httpRouter } = options;
        const vectorStore = await createPgVectorStore({
          ...options,
        });

        if (!embeddingsProvider) {
          throw new Error('No Embeddings Provider was registered.');
        }

        vectorStore.connectEmbeddings(await embeddingsProvider.getEmbeddings());

        const dataIngestionPipeline = createDataIngestionPipeline({
          ...options,
          vectorStore,
          ingestors,
        });

        const promptBuilder = createPromptBuilder(options);

        const chatService = await createChatService({
          ...options,
          models,
          vectorStore,
          promptBuilder,
        });

        httpRouter.use(await createRouter());
        dataIngestionPipeline.start();
      },
    });
  },
});
