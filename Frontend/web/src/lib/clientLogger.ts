import { createClientLog, type ClientLogPayload } from './api/clientLogs';

let initialized = false;
let user: { id?: string; email?: string } | null = null;
const seen = new Set<string>();

function isBrowser() {
  return typeof window !== 'undefined';
}

function getVersion() {
  return process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION || undefined;
}

function getSanitizedUrl() {
  if (!isBrowser()) return undefined;
  return window.location.pathname;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name,
      exceptionType: error.name,
      stackTrace: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

async function send(payload: ClientLogPayload) {
  if (!isBrowser()) return;

  const key = `${payload.level}:${payload.source}:${payload.message}:${payload.stackTrace ?? ''}`.slice(0, 500);
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 100) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }

  try {
    await createClientLog({
      level: 'error',
      source: 'web',
      platform: navigator.platform || 'web',
      appVersion: getVersion(),
      url: getSanitizedUrl(),
      context: {
        userId: user?.id,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        ...payload.context,
      },
      ...payload,
    });
  } catch {
    // Logging must never break user workflows.
  }
}

export const ClientLogger = {
  init() {
    if (!isBrowser() || initialized) return;
    initialized = true;

    window.addEventListener('error', event => {
      const normalized = normalizeError(event.error ?? event.message);
      void send({
        ...normalized,
        level: 'error',
        source: 'web',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', event => {
      const normalized = normalizeError(event.reason);
      void send({
        ...normalized,
        level: 'error',
        source: 'web',
        context: { kind: 'unhandledrejection' },
      });
    });
  },

  setUser(nextUser: { id?: string; email?: string } | null) {
    user = nextUser;
  },

  captureException(error: unknown, context?: Record<string, unknown>) {
    const normalized = normalizeError(error);
    void send({ ...normalized, level: 'error', source: 'web', context });
  },

  captureMessage(message: string, context?: Record<string, unknown>) {
    void send({ message, level: 'warning', source: 'web', context });
  },
};
