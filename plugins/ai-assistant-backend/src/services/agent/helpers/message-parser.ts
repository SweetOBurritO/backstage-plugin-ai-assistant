import { AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';

import {
  JsonObject,
  Message,
} from '@sweetoburrito/backstage-plugin-ai-assistant-common';
import { v4 as uuid, validate } from 'uuid';

export const parseLangchainMessage = (
  message: BaseMessage,
  traceId: string,
): Message => {
  const id = validate(message.id) ? message.id : uuid();
  const role = message.getType();
  const content =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);

  const metadata: JsonObject = {};

  if (role === 'ai') {
    const aiMessage = message as AIMessage;

    metadata.toolCalls = aiMessage.tool_calls || [];
    metadata.finishReason =
      aiMessage.response_metadata.finish_reason || undefined;
    metadata.modelName = aiMessage.response_metadata.model_name || undefined;
  }

  if (role === 'tool') {
    const toolMessage = message as ToolMessage;
    metadata.name = toolMessage.name || '';
  }

  return {
    id,
    role,
    content,
    metadata,
    score: 0,
    traceId,
  };
};
