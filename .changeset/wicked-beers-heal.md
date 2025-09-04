---
'@sweetoburrito/backstage-plugin-ai-assistant-backend-module-embeddings-provider-ollama': minor
'@sweetoburrito/backstage-plugin-ai-assistant-backend-module-model-provider-ollama': minor
'@sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-catalog': minor
'@sweetoburrito/backstage-plugin-ai-assistant-backend': minor
'@sweetoburrito/backstage-plugin-ai-assistant-node': minor
---

- Adds vectorstore to service
- Adds functionality to register embeddings providers from plugin modules
  - Add Ollama Embeddings Provier
- Add functionality to register model providers from plugin modules
  - Adds Ollama Model Provider
- Add ability to register data ingestors to pupulate vector DB for RAG retrevial
  - Add Catalog ingestor
- Add endpoints to have ai conversations and get models
