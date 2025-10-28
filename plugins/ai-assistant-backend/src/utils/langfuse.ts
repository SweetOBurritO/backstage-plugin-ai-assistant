/**
 * Langfuse Integration Utilities
 *
 * This module provides helper functions for integrating Langfuse tracing into the AI Assistant.
 * Langfuse is an open-source observability platform for LLM applications that provides tracing,
 * monitoring, and analytics capabilities.
 *
 * The integration is optional and will only be activated if all required environment variables
 * are present (LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL). If credentials
 * are not configured, the AI Assistant will function normally without tracing.
 *
 * @see https://langfuse.com/docs for Langfuse documentation
 * @module langfuse
 */

/**
 * Check if all required Langfuse credentials are available
 * @returns true if LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, and LANGFUSE_BASE_URL are all set
 */
export function hasLangfuseCredentials(): boolean {
  return !!(
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_BASE_URL
  );
}
