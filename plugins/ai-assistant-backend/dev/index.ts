import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

backend.add(import('@sweetoburrito/backstage-plugin-ai-assistant-backend'));

// Uncomment if you wan to use ollama

// backend.add(
//   import(
//     '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama'
//   ),
// );

// backend.add(
//   import(
//     '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama'
//   ),
// );

backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-azure-open-ai'
  ),
);

backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-azure-ai'
  ),
);

backend.add(
  import(
    '@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog'
  ),
);

backend.start();
