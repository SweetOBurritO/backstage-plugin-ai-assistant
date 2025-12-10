import {
  coreServices,
  createServiceFactory,
  createServiceRef,
  LoggerService,
  ServiceRef,
} from '@backstage/backend-plugin-api';
import { Model } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

export type ModelService = {
  registerModels: (modelProviders: Model[]) => void;
  getModel: (id: string) => Model;
  getAvailableModels: () => string[];
};

export type CreateModelServiceOptions = {
  logger: LoggerService;
};

const createModelService = async ({
  logger,
}: CreateModelServiceOptions): Promise<ModelService> => {
  const models: Model[] = [];

  const registerModels: ModelService['registerModels'] = async providers => {
    models.push(...providers);
  };

  const getModel: ModelService['getModel'] = id => {
    if (models.length === 0) {
      logger.error('No models have been registered.');
      throw new Error('No models have been registered.');
    }

    const provider = models.find(m => m.id === id);

    if (!provider) {
      logger.warn(
        `Model with id ${id} not found, using default ${models[0].id}.`,
      );
      return models[0];
    }

    return provider;
  };

  const getAvailableModels: ModelService['getAvailableModels'] = () => {
    return models.map(x => x.id);
  };

  return { registerModels, getModel, getAvailableModels };
};

export const modelServiceRef: ServiceRef<ModelService, 'plugin', 'singleton'> =
  createServiceRef<ModelService>({
    id: 'ai-assistant.model-service',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {
          logger: coreServices.logger,
        },
        factory: async options => {
          return createModelService(options);
        },
      }),
  });
