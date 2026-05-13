# CLAUDE.md — Claude Code Configuration

This file configures Claude Code's behavior for this project.

## Project Overview

Agent-first engineering scaffold. TypeScript monorepo with pnpm workspaces.
See [AGENTS.md](./AGENTS.md) for the full navigation map.

## Architecture Rules

- Follow the layered architecture defined in [ARCHITECTURE.md](./ARCHITECTURE.md)
- Dependency direction: Types → Config → Repo → Service → Runtime → UI
- Cross-cutting concerns via Providers only
- Max 300 lines per file
- Use structured logging

## Code Style

- TypeScript strict mode
- Single quotes, semicolons, trailing commas
- 100 char print width
- Prefer `const`, no `var`
- No `console.log` — use structured logger

## Key Commands

- `pnpm build` — Build all packages
- `pnpm lint` — Lint all packages
- `pnpm lint:arch` — Architecture constraint checks
- `pnpm test` — Run all tests
- `pnpm quality` — Quality assessment
- `pnpm scaffold` — Generate module scaffold

## Workflow

1. Read relevant docs before making changes
2. Create execution plans for non-trivial work in `docs/exec-plans/active/`
3. Follow architecture layers strictly
4. Run `pnpm lint:arch` after changes
5. Update docs if behavior changes

## Key Paths

- Shared code: `packages/shared/src/`
- Server code: `packages/server/src/`
- Web code: `packages/web/src/`
- Linter rules: `packages/linting/src/`
- Dev tools: `packages/tools/scripts/`
- Documentation: `docs/`
- Execution plans: `docs/exec-plans/`
