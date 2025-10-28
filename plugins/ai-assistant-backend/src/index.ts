// Initialize OpenTelemetry with Langfuse BEFORE anything else IF we have credentials in the environment variables
import './instrumentation';

export { aiAssistantPlugin as default } from './plugin';
