# @sweetoburrito/backstage-plugin-ai-assistant-backend

## 0.15.2

### Patch Changes

- 1b89c15: fix duplicate embedings id issue

## 0.15.1

### Patch Changes

- 2e6dd84: Added ability for ingestors to set last updated field

## 0.15.0

### Minor Changes

- 341565d: add recency biasing to vector store and enhance document handling

### Patch Changes

- Updated dependencies [341565d]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.10.0

## 0.14.0

### Minor Changes

- 6370262: Add conversation service and agent service

  - Introduced `ConversationService` to manage conversation-related functionalities.
  - Updated `ChatService` to utilize `ConversationService` for message handling and conversation management.
  - Implemented message parsing and filtering helpers for better message handling.
  - Introduced new `AgentService` to abstract llm logic to shared service
  - Refactored `ChatRouter` to accommodate new conversation and agent services.
  - Added new utility functions for user retrieval and tool filtering.
  - Updated summarization logic to leverage the new agent-based approach.
  - Improved error handling in model service to ensure model registration.

- 6370262: Add router integration for integrating directly with agent
- 593cee0: refactor tools registration and add non disableable core tools system
- 6370262: refactor AI assistant backend services and integrate new model management

### Patch Changes

- Updated dependencies [593cee0]
- Updated dependencies [6370262]
- Updated dependencies [6370262]
- Updated dependencies [6370262]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.8.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.9.0

## 0.13.0

### Minor Changes

- 1fda684: Fix ingestion process to retrieve raw markdown content from Azure DevOps wiki pages instead of HTML, ensuring correct formatting and data consistency.

## 0.12.1

### Patch Changes

- 68948f1: fixed an issue where when ingesting large documents the servie would hangup until complted

## 0.12.0

### Minor Changes

- 711a9ce: Added new mechanism to generically store user settings for the AI assistant
- 711a9ce: Added new endpoint to fetch tools available to the user

### Patch Changes

- Updated dependencies [711a9ce]
- Updated dependencies [7db5593]
- Updated dependencies [711a9ce]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.7.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.8.0

## 0.11.0

### Minor Changes

- c5b3126: Update tools schema to allow returning metadata along side content

### Patch Changes

- c5b3126: Update default prompts to return sources in responses from AI from tools that contain urls
- Updated dependencies [c5b3126]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.7.0

## 0.10.0

### Minor Changes

- 69de872: Refactored summarizer service and added new summary endpoints
- 5f8701c: Add Langfuse integration for analytics
- f26adee: - add mcp server configuration frontend
  - add mcp server configuration validation and error handling on frontend and backend
- 95b7cec: Add message scoring system (with optional langfuse integration)
- fdc5770: add google vertex ai model provider
- f26adee: added support for MCP through globally configured MCP and a Bring your own model for users
- 44b63b0: updated callback extension point to add ability to define callbacks for scoring system
- 0c1f2bf: Add support for extensible langchain callbacks through a new callback provider registration point

### Patch Changes

- Updated dependencies [dc46df1]
- Updated dependencies [f26adee]
- Updated dependencies [44b63b0]
- Updated dependencies [f26adee]
- Updated dependencies [95b7cec]
- Updated dependencies [f26adee]
- Updated dependencies [44b63b0]
- Updated dependencies [0c1f2bf]
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
