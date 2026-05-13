# Mint Session Isolation And Plan UI

**Created:** 2026-04-23
**Status:** Active
**Priority:** High

## Objective
Fix Mint's session isolation issues so each agent session keeps its own local mode and pending interaction state, and refresh the input UX so plan mode behaves like a first-class inline toggle instead of a separate control below the composer.

## Steps
1. [x] Audit current Mint session state ownership and document the isolation leaks.
2. [x] Refactor client state to scope drafts, permission mode, pending approvals, and active stream metadata by session.
3. [x] Redesign the composer so plan mode is surfaced inline and can be toggled with `Shift+Tab`.
4. [x] Verify the Mint package builds cleanly and note any follow-up risks.

## Dependencies
- `packages/mint/src/hooks/use-chat-stream.ts`
- `packages/mint/src/components/message-input.tsx`
- `packages/mint/src/components/agent-view.tsx`
- `packages/mint/src/components/mint-app.tsx`

## Success Criteria
- [x] Switching between agent sessions no longer leaks plan mode or pending approval UI.
- [x] A new unsent session can keep its own local draft state without inheriting the previous session's mode.
- [x] Plan mode is visible inline in the composer and `Shift+Tab` toggles it.
- [x] `@harness/mint` passes a targeted verification command.

## Notes
- Existing implementation already isolates persisted history on disk; the main issue appears to be in client-side session-scoped state.
- `pnpm --filter @harness/mint build` and `pnpm lint:arch` both passed after the refactor.
