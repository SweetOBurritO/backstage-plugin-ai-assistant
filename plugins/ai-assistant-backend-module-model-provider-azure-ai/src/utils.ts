import { BaseMessage } from '@langchain/core/messages';
import {
  ChatRequestMessage,
  ChatRequestUserMessage,
  ChatRequestAssistantMessage,
  ChatRequestSystemMessage,
} from '@azure-rest/ai-inference';

const getMessageType = (message: BaseMessage): ChatRequestMessage => {
  const type = message.getType();

  if (type === 'human') {
    return {
      role: 'user',
      content: message.content,
    } as ChatRequestUserMessage;
  }

  if (type === 'ai') {
    return {
      role: 'assistant',
      content: message.content,
    } as ChatRequestAssistantMessage;
  }

  if (type === 'system') {
    return {
      role: 'system',
      content: message.content,
    } as ChatRequestSystemMessage;
  }

  throw new Error(`Unsupported message type: ${type}`);
};

export const convertToAzureAiInferenceMessages = (
  messages: BaseMessage[],
): ChatRequestMessage[] => {
  return messages.map(getMessageType);
};
