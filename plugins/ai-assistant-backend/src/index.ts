// Initialize OpenTelemetry with Langfuse BEFORE anything else
import './instrumentation';

export { aiAssistantPlugin as default } from './plugin';
