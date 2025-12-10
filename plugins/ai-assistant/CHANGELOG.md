# @sweetoburrito/backstage-plugin-ai-assistant

## 0.10.0

### Minor Changes

- 593cee0: refactor tool fetching to set core tools as default enabled for first time users and ensure core tools are always enabled

### Patch Changes

- Updated dependencies [593cee0]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.8.0

## 0.9.0

### Minor Changes

- 001a89b: change feedback buttons to be hidden until hovered on

## 0.8.1

### Patch Changes

- 444c2aa: fix an issue where tools are not clickable if no settings have been set for tools yet

## 0.8.0

### Minor Changes

- 711a9ce: Added a new tab in the chat settings modal to allow users to choose what tools the ai assistant will have access to when being prompted

### Patch Changes

- Updated dependencies [711a9ce]
- Updated dependencies [7db5593]
- Updated dependencies [711a9ce]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.7.0

## 0.7.1

### Patch Changes

- 3300eca: update assistant page to use backstage page component

## 0.7.0

### Minor Changes

- f26adee: - add mcp server configuration frontend
  - add mcp server configuration validation and error handling on frontend and backend
- db4e544: Add modal to allow assistant to be accessible everywhere in backstage instance
- 95b7cec: Add message scoring system (with optional langfuse integration)
- 76def4f: update assistant modal to be hidden on ai page and introduce hook to hide modal on desired pages
- 69de872: Added page summaries as context to assistant modal

### Patch Changes

- Updated dependencies [dc46df1]
- Updated dependencies [f26adee]
- Updated dependencies [f26adee]
- Updated dependencies [95b7cec]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.6.0

## 0.6.0

### Minor Changes

- 0fc9105: fix duplicate messaged and broken skeletons for messages on frontend

## 0.5.0

### Minor Changes

- c15e38e: Added support for agent based tool execution

### Patch Changes

- Updated dependencies [c15e38e]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.5.0

## 0.4.1

### Patch Changes

- Updated dependencies [ac8745a]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.4.0

## 0.4.0

### Minor Changes

- 2c2e6b4: Added conversation switching

### Patch Changes

- Updated dependencies [388531c]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.3.0

## 0.3.2

### Patch Changes

- a65c303: Try fix pipeline
- Updated dependencies [a65c303]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.2

## 0.3.1

### Patch Changes

- 62152f7: Fix incorrect version resolution of dependancies
- Updated dependencies [62152f7]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.1

## 0.3.0

### Minor Changes

- 6594f18: Fix breaking dependnacy resolution preventing installs

### Patch Changes

- Updated dependencies [6594f18]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.2.0

## 0.2.0

### Minor Changes

- d0b919b: Added frontend plugin to allow user interaction with ai assistant
- bf0f601: Added better formatting to messages on frontend

### Patch Changes

- Updated dependencies [d0b919b]
  - @sweetoburrito/backstage-plugin-ai-assistant-common@0.1.1
