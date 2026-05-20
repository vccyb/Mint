import type { Mode } from '../types';

const DRAFT_SESSION_PREFIX = '__draft__';
const INITIAL_DRAFT_SESSION_SUFFIX = 'initial';

export function createInitialDraftSessionKey(mode: Mode): string {
  return [DRAFT_SESSION_PREFIX, mode, INITIAL_DRAFT_SESSION_SUFFIX].join(':');
}

export function createDraftSessionKey(mode: Mode): string {
  return [
    DRAFT_SESSION_PREFIX,
    mode,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8),
  ].join(':');
}

export function isDraftSessionKey(sessionKey: string | null | undefined): boolean {
  return typeof sessionKey === 'string' && sessionKey.startsWith(DRAFT_SESSION_PREFIX);
}
