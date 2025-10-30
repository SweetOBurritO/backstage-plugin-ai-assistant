# @sweetoburrito/backstage-plugin-ai-assistant-backend

## 0.10.0

### Minor Changes

- 5f8701c: Add Langfuse integration for analytics
- f26adee: - add mcp server configuration frontend
  - add mcp server configuration validation and error handling on frontend and backend
- 95b7cec: Add message scoring system (with optional langfuse integration)
- fdc5770: add google vertex ai model provider
- f26adee: added support for MCP through globally configured MCP and a Bring your own model for users

### Patch Changes

- Updated dependencies [f26adee]
- Updated dependencies [f26adee]
- Updated dependencies [95b7cec]
- Updated dependencies [f26adee]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.6.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.6.0

## 0.9.0

### Minor Changes

- 8cce0db: added tool provider for backstage actions registry
- f65da94: Add split identity and formatting prompts for improved quality and control of responses

### Patch Changes

- 2f5a179: fix issue where last message in an ai response is duplicated

## 0.8.0

### Minor Changes

- 0fc9105: fix duplicate messaged and broken skeletons for messages on frontend
- a398ebf: Swap to full message streaming instead of chunking to fix issue preventing tools from running
- 3f477e3: Add user context to prompts.

## 0.7.1

### Patch Changes

- 594fa77: optimised ingestor embedding to allow incremental deletes and updates
- Updated dependencies [594fa77]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.5.1

## 0.7.0

### Minor Changes

- c15e38e: Added support for agent based tool execution

### Patch Changes

- Updated dependencies [c15e38e]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.5.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.5.0

## 0.6.1

### Patch Changes

- Updated dependencies [ac8745a]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.4.0

## 0.6.0

### Minor Changes

- 4811129: added Azure DevOps ingestor module

### Patch Changes

- Updated dependencies [4811129]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.4.0

## 0.5.0

### Minor Changes

- 2c2e6b4: Added conversation switching
- 388531c: Added ability for conversations to be summarized and the summary set as a conversation title

### Patch Changes

- Updated dependencies [388531c]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.3.0

## 0.4.3

### Patch Changes

- 76ce717: fix an issue where the system prompt was incorrectly setup and caused it not to be used

## 0.4.2

### Patch Changes

- a65c303: Try fix pipeline
- Updated dependencies [a65c303]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.2
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.3.2

## 0.4.1

### Patch Changes

- 62152f7: Fix incorrect version resolution of dependancies
- Updated dependencies [62152f7]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.1
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.3.1

## 0.4.0

### Minor Changes

- 6594f18: Fix breaking dependnacy resolution preventing installs

### Patch Changes

- Updated dependencies [6594f18]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.3.0

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
