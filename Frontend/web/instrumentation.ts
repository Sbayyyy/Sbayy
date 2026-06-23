import * as Sentry from "@sentry/nextjs";

/**
 * Initializes Sentry's server or edge instrumentation for the active Next.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Captures unhandled Next.js request errors through Sentry.
 */
export const onRequestError = Sentry.captureRequestError;
