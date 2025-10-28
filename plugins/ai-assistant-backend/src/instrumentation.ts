import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

// Initialize the Langfuse span processor
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  // Explicitly pass configuration from environment variables
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

// Initialize OpenTelemetry SDK with Langfuse processor
const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();
