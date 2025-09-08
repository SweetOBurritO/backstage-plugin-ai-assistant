# @sweetoburrito/backstage-plugin-ai-assistant-backend

## 0.3.0

### Minor Changes

- d0b919b: add mechanism for messages to be streamed to the frontend
- ef4391b: fix issue where order of chats were not preserved

### Patch Changes

- Updated dependencies [d0b919b]
- Updated dependencies [d0b919b]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.1.1
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.2.2

## 0.2.1

### Patch Changes

- 0d8252e: Fix backstage plugin setup
- Updated dependencies [0d8252e]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.2.1

## 0.2.0

### Minor Changes

- 33b80c6: - Adds vectorstore to service
  - Adds functionality to register embeddings providers from plugin modules
    - Add Ollama Embeddings Provier
  - Add functionality to register model providers from plugin modules
    - Adds Ollama Model Provider
  - Add ability to register data ingestors to pupulate vector DB for RAG retrevial
    - Add Catalog ingestor
  - Add endpoints to have ai conversations and get models

### Patch Changes

- Updated dependencies [33b80c6]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.2.0
