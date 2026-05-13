/**
 * Result type for explicit error handling without exceptions.
 * Following the agent-first principle: make errors visible in types.
 */
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T, E = string>(value: T): Result<T, E> => ({
  ok: true,
  value,
});

export const err = <T, E = string>(error: E): Result<T, E> => ({
  ok: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } =>
  result.ok;

export const isErr = <T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } =>
  !result.ok;
