/**
 * Permission store for Electron main process.
 * Uses module-level Map instead of globalThis (which was a Next.js server workaround).
 * Allows the agent stream to await user decisions from IPC agent:answer calls.
 */

import { PERMISSION_TIMEOUT_MS } from './constants';
import { createLogger } from './logger';

const log = createLogger('lib.permission-store');

export type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string };

interface PendingPermission {
  resolve: (result: PermissionResult) => void;
  toolName: string;
  toolUseId: string;
}

const store = new Map<string, PendingPermission>();

export function addPending(
  requestId: string,
  toolName: string,
  toolUseId: string,
): Promise<PermissionResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log.warn('Permission request timed out', { requestId, toolName });
      resolve({ behavior: 'deny', message: 'Permission request timed out' });
      store.delete(requestId);
    }, PERMISSION_TIMEOUT_MS);

    store.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      toolName,
      toolUseId,
    });
    log.debug('Permission request pending', { requestId, toolName });
  });
}

export function resolvePending(requestId: string, result: PermissionResult): boolean {
  const entry = store.get(requestId);
  if (!entry) return false;
  log.info('Permission resolved', { requestId, behavior: result.behavior });
  entry.resolve(result);
  store.delete(requestId);
  return true;
}
