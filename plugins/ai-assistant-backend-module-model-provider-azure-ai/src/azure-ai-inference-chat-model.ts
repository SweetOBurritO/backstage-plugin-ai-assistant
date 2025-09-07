import {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import createClient, { ModelClient } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { concat } from '@langchain/core/utils/stream';
import { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import { convertToAzureAiInferenceMessages } from './utils';
import { createSseStream } from '@azure/core-sse';

export interface ChatAzureAiInferenceInputs extends BaseChatModelParams {
  modelName: string;
  endpoint: string;
  apiKey: string;
}

export class AzureAiInferenceChatModel
  extends BaseChatModel
  implements ChatAzureAiInferenceInputs
{
  modelName: string;
  endpoint: string;
  apiKey: string;
  private client: ModelClient;

  constructor({
    modelName,
    endpoint,
    apiKey,
    ...rest
  }: ChatAzureAiInferenceInputs) {
    super(rest);
    this.modelName = modelName;
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.client = createClient(endpoint, new AzureKeyCredential(apiKey));
  }

  _llmType(): string {
    return 'azure-ai-inference';
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const aiInferenceMessages = convertToAzureAiInferenceMessages(messages);

    const response = await this.client
      .path('/chat/completions')
      .post({
        body: {
          stream: true,
          messages: aiInferenceMessages,
        },
      })
      .asNodeStream();

    const stream = response.body;

    if (!stream) {
      throw new Error('Azure AI Inference response stream is undefined');
    }

    if (response.status !== '200') {
      stream.destroy();
      throw new Error(
        `Failed to get chat completions. Operation failed with ${response.status} code.`,
      );
    }

    const sseStream = createSseStream(stream);

    for await (const event of sseStream) {
      if (event.data === '[DONE]') {
        yield new ChatGenerationChunk({
          text: '',
          message: new AIMessageChunk({
            content: '',
          }),
        });
      }

      for (const choice of JSON.parse(event.data).choices) {
        const token = choice.delta?.content ?? '';

        const responseMessage = new AIMessageChunk({
          content: token,
        });

        yield new ChatGenerationChunk({
          text: token,
          message: responseMessage,
        });
        await runManager?.handleLLMNewToken(token);
      }
    }
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    let finalChunk: AIMessageChunk | undefined;
    for await (const chunk of this._streamResponseChunks(
      messages,
      options,
      runManager,
    )) {
      if (!finalChunk) {
        finalChunk = chunk.message;
      } else {
        finalChunk = concat(finalChunk, chunk.message);
      }
    }

    // Convert from AIMessageChunk to AIMessage since `generate` expects AIMessage.
    const nonChunkMessage = new AIMessage({
      id: finalChunk?.id,
      content: finalChunk?.content ?? '',
      tool_calls: finalChunk?.tool_calls,
      response_metadata: finalChunk?.response_metadata,
      usage_metadata: finalChunk?.usage_metadata,
    });
    return {
      generations: [
        {
          text:
            typeof nonChunkMessage.content === 'string'
              ? nonChunkMessage.content
              : '',
          message: nonChunkMessage,
        },
      ],
    };
  }
}
