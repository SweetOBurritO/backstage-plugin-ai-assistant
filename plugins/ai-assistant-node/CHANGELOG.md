# @sweetoburrito/backstage-plugin-ai-assistant-node

## 0.8.0

### Minor Changes

- 711a9ce: Moved Tool type definition from @sweetoburrito/backstage-plugin-ai-assistant-node to @sweetoburrito/backstage-plugin-ai-assistant-common

### Patch Changes

- Updated dependencies [711a9ce]
- Updated dependencies [7db5593]
- Updated dependencies [711a9ce]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.7.0

## 0.7.0

### Minor Changes

- c5b3126: Update tools schema to allow returning metadata along side content

## 0.6.1

### Patch Changes

- 4a98fcc: fix package resolution issue

## 0.6.0

### Minor Changes

- 44b63b0: added user info utility fn
- f26adee: - add mcp server configuration frontend
  - add mcp server configuration validation and error handling on frontend and backend
- f26adee: Added simple encryption and decryption utils
- 44b63b0: updated callback extension point to add ability to define callbacks for scoring system
- 0c1f2bf: Add support for extensible langchain callbacks through a new callback provider registration point

### Patch Changes

- Updated dependencies [dc46df1]
- Updated dependencies [f26adee]
- Updated dependencies [f26adee]
- Updated dependencies [95b7cec]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.6.0

## 0.5.1

### Patch Changes

- 594fa77: optimised ingestor embedding to allow incremental deletes and updates

## 0.5.0

### Minor Changes

- c15e38e: Added support for agent based tool execution

## 0.4.0

### Minor Changes

- 4811129: added Azure DevOps ingestor module

## 0.3.2

### Patch Changes

- a65c303: Try fix pipeline

## 0.3.1

### Patch Changes

- 62152f7: Fix incorrect version resolution of dependancies

## 0.3.0

### Minor Changes

- 6594f18: Fix breaking dependnacy resolution preventing installs

## 0.2.2

### Patch Changes

- d0b919b: remove types now in common package

## 0.2.1

### Patch Changes

- 0d8252e: Fix backstage plugin setup

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
