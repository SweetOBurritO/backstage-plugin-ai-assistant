import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

backend.add(import('@backstage/plugin-catalog-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));
backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama'
  ),
);

backend.add(import('../src'));

backend.start();
