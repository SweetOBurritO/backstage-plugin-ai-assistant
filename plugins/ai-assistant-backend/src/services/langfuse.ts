import {
  RootConfigService,
  RootLoggerService,
} from '@backstage/backend-plugin-api';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseClient } from '@langfuse/client';

export function initLangfuse(
  config: RootConfigService,
  logger: RootLoggerService,
): { langfuseEnabled: boolean; langfuseClient: LangfuseClient | undefined } {
  const langfuseSecret = config.getOptionalString(
    'aiAssistant.langfuse.secretKey',
  );
  const langfusePublic = config.getOptionalString(
    'aiAssistant.langfuse.publicKey',
  );
  const langfuseBaseUrl = config.getOptionalString(
    'aiAssistant.langfuse.baseUrl',
  );

  let langfuseSpanProcessor: LangfuseSpanProcessor | undefined = undefined;
  if (langfuseSecret && langfusePublic && langfuseBaseUrl) {
    langfuseSpanProcessor = new LangfuseSpanProcessor({
      secretKey: langfuseSecret,
      publicKey: langfusePublic,
      baseUrl: langfuseBaseUrl,
    });

    const sdk = new NodeSDK({
      spanProcessors: [langfuseSpanProcessor],
    });

    const langfuseClient = new LangfuseClient({
      secretKey: langfuseSecret,
      publicKey: langfusePublic,
      baseUrl: langfuseBaseUrl,
    });

    logger.info(
      'Langfuse: Starting OpenTelemetry SDK with LangfuseSpanProcessor',
    );
    sdk.start();
    return { langfuseEnabled: true, langfuseClient };
  }
  logger.info(
    'Langfuse: Skipping Langfuse initialization, credentials not found.',
  );
  return {
    langfuseEnabled: false,
    langfuseClient: undefined,
  };
}
