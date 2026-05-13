/**
 * Server-side permission store using globalThis for cross-route sharing.
 * Allows the SSE stream to await user decisions from the /api/agent/answer endpoint.
 */

import { PERMISSION_TIMEOUT_MS } from '@/lib/constants';

export type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string };

interface PendingPermission {
  resolve: (result: PermissionResult) => void;
  toolName: string;
  toolUseId: string;
}

const STORE_KEY = '__mint_permission_store__';

function getStore(): Map<string, PendingPermission> {
  const g = globalThis as Record<string, unknown>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map<string, PendingPermission>();
  }
  return g[STORE_KEY] as Map<string, PendingPermission>;
}

export function addPending(
  requestId: string,
  toolName: string,
  toolUseId: string,
): Promise<PermissionResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ behavior: 'deny', message: 'Permission request timed out' });
      getStore().delete(requestId);
    }, PERMISSION_TIMEOUT_MS);

    getStore().set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      toolName,
      toolUseId,
    });
  });
}

export function resolvePending(
  requestId: string,
  result: PermissionResult,
): boolean {
  const store = getStore();
  const entry = store.get(requestId);
  if (!entry) return false;
  entry.resolve(result);
  store.delete(requestId);
  return true;
}
