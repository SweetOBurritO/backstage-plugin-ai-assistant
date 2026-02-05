# @sweetoburrito/backstage-plugin-ai-assistant-common

## 0.9.0

### Minor Changes

- 969ac04: migrate to langchain v1

## 0.8.0

### Minor Changes

- 593cee0: include description in EnabledTool type definition and remove user tool type

## 0.7.0

### Minor Changes

- 711a9ce: Moved Tool type definition from @sweetoburrito/backstage-plugin-ai-assistant-node to @sweetoburrito/backstage-plugin-ai-assistant-common
- 711a9ce: Added new UserTool type

### Patch Changes

- 7db5593: fix filtering logic for paths

## 0.6.0

### Minor Changes

- dc46df1: add path filtering tom github and azure ingestors to allow ignoring specific files from ingestion
- f26adee: Added mcp server types
- f26adee: - add mcp server configuration frontend
  - add mcp server configuration validation and error handling on frontend and backend
- 95b7cec: Add message scoring system (with optional langfuse integration)

## 0.5.0

### Minor Changes

- c15e38e: Added support for agent based tool execution

## 0.4.0

### Minor Changes

- ac8745a: add Azure DevOps wiki ingestion functionality

## 0.3.0

### Minor Changes

- 388531c: Added ability for conversations to be summarized and the summary set as a conversation title

## 0.2.2

### Patch Changes

- a65c303: Try fix pipeline

## 0.2.1

### Patch Changes

- 62152f7: Fix incorrect version resolution of dependancies

## 0.2.0

### Minor Changes

- 6594f18: Fix breaking dependnacy resolution preventing installs

## 0.1.1

### Patch Changes

- d0b919b: add common library for shared frontend and backend utils
