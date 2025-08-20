/**
 * Environment utility functions
 */

/**
 * Check if we're running in Architect's local sandbox
 */
export function isLocal(): boolean {
  // Architect sets this when running sandbox
  return process.env.ARC_LOCAL === "true";
}

/**
 * Check if we're running in a real AWS environment
 */
export function isProduction(): boolean {
  return !isLocal();
}
