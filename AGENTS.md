# AGENTS.md — Agent Navigation Map

> "Give the agent a map, not a 1000-page manual."

## Project Overview

**Harness Project** — An agent-first engineering scaffold. Humans steer, agents execute.
The engineer's job is to design environments, express intent, and build feedback loops.

**Tech Stack:** TypeScript (Node.js + React) | Monorepo (pnpm workspaces)
**Agent:** Claude Code (Anthropic)

## Directory Structure

```
harness-project/
├── AGENTS.md              ← You are here. Start here for every task.
├── CLAUDE.md              ← Claude Code native config
├── ARCHITECTURE.md        ← Layered architecture & dependency rules (MUST READ)
├── docs/                  ← Structured documentation system
│   ├── design-docs/       ← Design documents & core beliefs
│   ├── exec-plans/        ← Execution plans (active/completed)
│   ├── generated/         ← Auto-generated docs (e.g., db-schema)
│   ├── product-specs/     ← Product specifications
│   ├── references/        ← Third-party reference docs
│   ├── DESIGN.md          ← Design system guide
│   ├── FRONTEND.md        ← Frontend architecture guide
│   ├── PLANS.md           ← Plan workflow guide
│   ├── PRODUCT_SENSE.md   ← Product principles & decision framework
│   ├── QUALITY_SCORE.md   ← Quality scoring system
│   ├── RELIABILITY.md     ← Reliability engineering requirements
│   └── SECURITY.md        ← Security specifications
├── packages/
│   ├── shared/            ← Shared types, utils, constants
│   ├── server/            ← Backend service (layered: types→config→repo→service→runtime)
│   ├── web/               ← Frontend React app
│   ├── linting/           ← Custom architecture enforcement linter
│   └── tools/             ← Developer tools (doc-gardener, quality-scorer, scaffold)
└── .github/workflows/     ← CI/CD pipelines
```

## Quick Links

| Need | Go To |
|------|-------|
| Architecture rules | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Core principles | [docs/design-docs/core-beliefs.md](./docs/design-docs/core-beliefs.md) |
| Quality standards | [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) |
| Security requirements | [docs/SECURITY.md](./docs/SECURITY.md) |
| Frontend patterns | [docs/FRONTEND.md](./docs/FRONTEND.md) |
| Plan workflow | [docs/PLANS.md](./docs/PLANS.md) |
| Product decisions | [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) |

## Development Workflow

1. **Understand** → Read AGENTS.md, then relevant docs for the domain
2. **Plan** → Create an execution plan in `docs/exec-plans/active/`
3. **Implement** → Follow architecture layers strictly (see ARCHITECTURE.md)
4. **Verify** → Run `pnpm lint:arch` for architecture compliance
5. **Score** → Run `pnpm quality` for quality assessment
6. **Document** → Update relevant docs if behavior changed

## Key Commands

```bash
pnpm build          # Build all packages
pnpm lint           # Lint all packages
pnpm lint:arch      # Run architecture constraint checks
pnpm test           # Run all tests
pnpm quality        # Assess quality scores
pnpm scaffold       # Generate new module scaffold
pnpm doc:garden     # Run documentation gardener
```

## Architecture Constraints (TL;DR)

- Dependency direction: **Types → Config → Repo → Service → Runtime → UI**
- Cross-cutting concerns enter via **Providers** with explicit interfaces
- Max file size: **300 lines** (enforced by linter)
- All logging must be **structured** (enforced by linter)
- Shared utilities go in `packages/shared/` — no one-off helpers
- Plans are first-class artifacts in `docs/exec-plans/`

## Golden Rules

1. **Repo is the knowledge boundary** — if it's not in the repo, it doesn't exist for the agent
2. **Progressive disclosure** — start from AGENTS.md, drill down as needed
3. **Enforce invariants in code** — linters and tests, not just docs
4. **Plans are first-class citizens** — version-controlled execution plans
5. **Shared tools first** — centralize in shared package, no disposable helpers
6. **Boundary validation** — typed SDKs, no YOLO data exploration
7. **Encode taste** — human feedback → doc update → tool/rule encoding
