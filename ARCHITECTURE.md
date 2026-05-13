# ARCHITECTURE.md — Layered Architecture & Dependency Rules

## Overview

This project follows a strict layered architecture. Layers define dependency boundaries —
code in a layer may only depend on layers below it, never above it.

## Layer Stack

```
┌─────────────────────────────────────────────────┐
│  UI Layer (packages/web/)                       │
│  Components, Pages, Hooks                       │
├─────────────────────────────────────────────────┤
│  Runtime Layer (packages/server/src/runtime/)   │
│  API Routes, Middleware, WebSocket Handlers      │
├─────────────────────────────────────────────────┤
│  Service Layer (packages/server/src/services/)  │
│  Business Logic, Orchestration, Workflows       │
├─────────────────────────────────────────────────┤
│  Provider Layer (packages/server/src/providers/)│
│  Auth, Telemetry, Feature Flags, External APIs  │
├─────────────────────────────────────────────────┤
│  Repo Layer (packages/server/src/repo/)         │
│  Data Access, Database Queries, External Stores │
├─────────────────────────────────────────────────┤
│  Config Layer (packages/server/src/config/)     │
│  Environment Config, Feature Flags, Constants   │
├─────────────────────────────────────────────────┤
│  Types Layer (packages/server/src/types/)       │
│  Type Definitions, Interfaces, Schemas          │
├─────────────────────────────────────────────────┤
│  Shared (packages/shared/)                      │
│  Cross-cutting Types, Utils, Constants          │
└─────────────────────────────────────────────────┘
```

## Dependency Direction

**Allowed direction: Top → Bottom** (a layer may depend on any layer below it)

**Forbidden direction: Bottom → Top** (a layer must never depend on a layer above it)

```
Types ← Config ← Repo ← Provider ← Service ← Runtime ← UI
  ↓        ↓       ↓        ↓          ↓         ↓       ↓
  └────────┴───────┴────────┴──────────┴─────────┘
                    Shared (accessible by all)
```

### Rules

| Layer | May depend on |
|-------|--------------|
| Shared | Nothing (leaf dependency) |
| Types | Shared |
| Config | Types, Shared |
| Repo | Config, Types, Shared |
| Provider | Config, Types, Shared (NOT Repo) |
| Service | Provider, Repo, Config, Types, Shared |
| Runtime | Service, Provider, Config, Types, Shared (NOT Repo directly) |
| UI | Service types, Types, Shared |

### Important Notes

- **Provider vs Repo**: Providers handle cross-cutting concerns (auth, telemetry, feature flags).
  They do NOT access data directly — they receive data through explicit interfaces.
- **Runtime → Service**: The runtime layer calls services, never repos directly.
  This ensures business logic is centralized.
- **UI → Service**: The UI layer only consumes service types (via shared),
  never directly imports server code.

## Cross-Cutting Concerns

Cross-cutting concerns (logging, auth, telemetry, feature flags) enter the system through
the **Provider** layer via explicit interfaces:

```typescript
// packages/server/src/providers/auth/types.ts
export interface AuthProvider {
  authenticate(token: string): Promise<User>;
  authorize(user: User, permission: string): boolean;
}
```

Services receive providers through dependency injection:

```typescript
// packages/server/src/services/user-service.ts
export class UserService {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepo: UserRepository,
  ) {}
}
```

## Monorepo Package Boundaries

| Package | Responsibility | May depend on |
|---------|---------------|---------------|
| `@harness/shared` | Types, utils, constants | Nothing external |
| `@harness/server` | Backend service | `@harness/shared`, `@harness/linting` (dev) |
| `@harness/web` | Frontend application | `@harness/shared` |
| `@harness/linting` | Architecture enforcement | `@harness/shared` (dev) |
| `@harness/tools` | Developer tools | `@harness/shared` (dev) |

## File Size Limits

- **Max 300 lines per file** — enforced by custom linter
- If a file exceeds 300 lines, extract responsibilities into new files
- Agent-generated code must respect this limit

## Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Files | kebab-case | `user-repository.ts` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `formatUserName` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Test files | `<name>.test.ts` | `user-service.test.ts` |
| Directories | kebab-case | `user-management/` |

## Enforcement

Architecture rules are enforced by:
1. **Custom linter** (`packages/linting/`) — checks dependency direction, file size, naming
2. **CI pipeline** — runs linter on every PR
3. **Code review** — architectural compliance is a review criterion

Run `pnpm lint:arch` to check architecture compliance locally.
