/**
 * Error thrown when Sanity is configured for this deployment but a write
 * cannot be persisted (missing write token, rejected mutation, or API failure).
 * Prevents silent fallback to ephemeral local `.data` files on serverless hosts.
 */
export class SanityPersistenceError extends Error {
  readonly status: number;

  constructor(message: string, status: number = 502, options?: ErrorOptions) {
    super(message, options);
    this.name = "SanityPersistenceError";
    this.status = status;
  }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof SanityPersistenceError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function errorStatus(err: unknown, fallback = 500): number {
  if (err instanceof SanityPersistenceError) return err.status;
  return fallback;
}
