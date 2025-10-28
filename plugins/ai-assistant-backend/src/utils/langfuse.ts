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
