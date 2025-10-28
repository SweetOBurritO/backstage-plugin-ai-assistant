import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { hasLangfuseCredentials } from './utils/langfuse';

export let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;

if (hasLangfuseCredentials()) {
  // Initialize the Langfuse span processor
  langfuseSpanProcessor = new LangfuseSpanProcessor({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  });

  // Initialize OpenTelemetry SDK with Langfuse processor
  const sdk = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor],
  });

  sdk.start();
}
