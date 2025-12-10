---
'@sweetoburrito/backstage-plugin-ai-assistant-backend': minor
'@sweetoburrito/backstage-plugin-ai-assistant-node': minor
---
Add conversation service and agent service

- Introduced `ConversationService` to manage conversation-related functionalities.
- Updated `ChatService` to utilize `ConversationService` for message handling and conversation management.
- Implemented message parsing and filtering helpers for better message handling.
- Introduced new `AgentService` to abstract llm logic to shared service
- Refactored `ChatRouter` to accommodate new conversation and agent services.
- Added new utility functions for user retrieval and tool filtering.
- Updated summarization logic to leverage the new agent-based approach.
- Improved error handling in model service to ensure model registration.
