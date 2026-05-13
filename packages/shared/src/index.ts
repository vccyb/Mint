/**
 * @harness/shared — Cross-cutting types, utilities, and constants.
 *
 * This package is the leaf dependency. Everything else depends on it,
 * and it depends on nothing external.
 */
export type { Result } from './types/result.js';
export type { ErrorCode, AppError } from './types/errors.js';
export { ok, err, isOk, isErr } from './types/result.js';
export { APP_NAME, APP_VERSION } from './constants/app.js';
