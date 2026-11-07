import { getDb } from './db';

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_TRANSITION'
  | 'VALIDATION'
  | 'OUT_OF_STOCK'
  | 'UNAUTHENTICATED'
  | 'CONFLICT'
  | 'PRESCRIPTION_REQUIRED';

/** Consistent error type thrown by every simulated service. */
export class ServiceError extends Error {
  code: ServiceErrorCode;
  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ServiceError';
  }
}

let delayEnabled = true;

/** Test hook: disable simulated latency. */
export function setSimulatedLatency(enabled: boolean) {
  delayEnabled = enabled;
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Wraps a synchronous handler as an asynchronous "API request" with a small simulated
 * delay, so the UI exercises real loading states. Swap the body for fetch/Supabase later.
 */
export async function request<T>(handler: () => T, opts: { delay?: number } = {}): Promise<T> {
  if (delayEnabled) {
    const base = opts.delay ?? getDb().settings.simulatedDelayMs ?? 300;
    await wait(base + Math.floor(Math.random() * 120));
  }
  return handler();
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ServiceError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}

export function nowIso() {
  return new Date().toISOString();
}
