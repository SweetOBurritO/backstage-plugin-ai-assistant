# @sweetoburrito/backstage-plugin-ai-assistant-backend-module-ingestor-azure-devops

## 0.8.3

### Patch Changes

- Updated dependencies [969ac04]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.9.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.11.0

## 0.8.2

### Patch Changes

- 9ca336d: Upgrade to backstage 1.47.2

## 0.8.1

### Patch Changes

- acab9f1: add error handling for Azure DevOps content retrieval in repository and wiki ingestors

## 0.8.0

### Minor Changes

- 2e6dd84: Update azure devops ingestion to set last updated field for embeddings

## 0.7.0

### Minor Changes

- 341565d: add ado resource filtering using regex

### Patch Changes

- Updated dependencies [341565d]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.10.0

## 0.6.1

### Patch Changes

- Updated dependencies [593cee0]
- Updated dependencies [6370262]
- Updated dependencies [6370262]
- Updated dependencies [6370262]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.8.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.9.0

## 0.6.0

### Minor Changes

- 1fda684: Fix ingestion process to retrieve raw markdown content from Azure DevOps wiki pages instead of HTML, ensuring correct formatting and data consistency.

## 0.5.2

### Patch Changes

- 7db5593: The change fixed a null pointer error in the Azure DevOps ingestor that was crashing during repository ingestion.
- 7db5593: Update default exclusions to support matching paths that dont start with the exclusion
- Updated dependencies [711a9ce]
- Updated dependencies [7db5593]
- Updated dependencies [711a9ce]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.7.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.8.0

## 0.5.1

### Patch Changes

- Updated dependencies [c5b3126]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.7.0

## 0.5.0

### Minor Changes

- dc46df1: add path filtering tom github and azure ingestors to allow ignoring specific files from ingestion

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

## 0.4.2

### Patch Changes

- 594fa77: optimised ingestor embedding to allow incremental deletes and updates
- Updated dependencies [594fa77]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.5.1

## 0.4.1

### Patch Changes

- Updated dependencies [c15e38e]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.5.0
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.5.0

## 0.4.0

### Minor Changes

- dae4eda: add repository file batching

## 0.3.0

### Minor Changes

- ac8745a: add Azure DevOps wiki ingestion functionality

### Patch Changes

- Updated dependencies [ac8745a]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.4.0

## 0.2.1

### Patch Changes

- dc492ea: fix package config

## 0.2.0

### Minor Changes

- 4811129: added Azure DevOps ingestor module

### Patch Changes

- Updated dependencies [4811129]
  - @sweetoburrito/backstage-plugin-ai-assistant-node@0.4.0
