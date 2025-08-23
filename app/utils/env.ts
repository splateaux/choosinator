/**
 * Environment utility functions
 */

/**
 * Check if we're running in local development
 */
export function isLocal(): boolean {
  // Check if we're running locally (not in Azure)
  return (
    process.env.NODE_ENV === "development" || process.env.ARC_LOCAL === "true"
  );
}

/**
 * Check if we're running in Azure production
 */
export function isProduction(): boolean {
  return !isLocal();
}
