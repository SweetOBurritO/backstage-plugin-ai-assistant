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
} from '@sweetoburrito/backstage-plugin-ai-assistant-node';
import { createPgVectorStore } from './database';
import { createDataIngestionPipeline } from './services/ingestor';

/**
 * aiAssistantPlugin backend plugin
 *
 * @public
 */
export const aiAssistantPlugin = createBackendPlugin({
  pluginId: 'ai-assistant',
  register(env) {
    const ingestors: Ingestor[] = [];

    let embeddingsProvider: EmbeddingsProvider;

    env.registerExtensionPoint(dataIngestorExtensionPoint, {
      registerIngestor: ingestor => {
        ingestors.push(ingestor);
      },
    });

    env.registerExtensionPoint(embeddingsProviderExtensionPoint, {
      register: provider => {
        embeddingsProvider = provider;
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

        httpRouter.use(await createRouter());
        dataIngestionPipeline.start();
      },
    });
  },
});
