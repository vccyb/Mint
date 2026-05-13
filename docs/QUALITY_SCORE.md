# Quality Score System

## Overview

The quality score system provides a measurable, consistent way to assess code quality
across product domains and architecture layers. Scores are computed by `pnpm quality`
and reported in CI.

## Scoring Dimensions

Each dimension is scored 0–10.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Test Coverage | 25% | Line/branch coverage of business logic |
| Documentation | 20% | Completeness of inline and external docs |
| Architecture Compliance | 25% | Adherence to layered architecture rules |
| Security Compliance | 15% | Pass rate on security checks |
| Maintainability | 15% | File sizes, cyclomatic complexity, coupling |

## Overall Score

```
Overall = Σ (dimension_score × weight)
```

| Score Range | Grade | Meaning |
|-------------|-------|---------|
| 9.0 – 10.0 | A+ | Excellent — no action needed |
| 8.0 – 8.9 | A | Good — minor improvements possible |
| 7.0 – 7.9 | B | Acceptable — some areas need attention |
| 6.0 – 6.9 | C | Needs work — significant gaps exist |
| 5.0 – 5.9 | D | Poor — requires immediate attention |
| 0.0 – 4.9 | F | Failing — blocking issues present |

## Per-Layer Scoring

Each architecture layer is scored independently:

### Types Layer
- All types exported from index
- No `any` types
- All types documented with JSDoc

### Config Layer
- Environment variables validated at startup
- No hardcoded configuration values
- All configs typed

### Repo Layer
- All queries parameterized (no string interpolation)
- Result types for all operations
- No business logic in data access

### Provider Layer
- Explicit interfaces for all providers
- Dependency injection used consistently
- No direct data access

### Service Layer
- Unit test coverage ≥ 80%
- All error paths tested
- No external API calls outside providers
- Structured logging used

### Runtime Layer
- All routes typed
- Middleware properly ordered
- Error handling at route level
- No business logic in routes

### UI Layer
- Component props typed
- Accessibility attributes present
- No inline styles (use design tokens)
- Loading and error states handled

## Running Quality Checks

```bash
# Full quality assessment
pnpm quality

# Architecture compliance only
pnpm lint:arch

# Test coverage
pnpm test
```

## CI Integration

Quality scores are computed on every PR:
- Overall score must be ≥ 7.0 to merge
- No individual dimension can be below 5.0
- New code must not decrease the overall score

## Improving Scores

When a score is low, follow the remediation path:

1. **Test Coverage** → Write tests for untested code paths
2. **Documentation** → Add JSDoc to public APIs, update docs/
3. **Architecture** → Run `pnpm lint:arch` and fix violations
4. **Security** → Address findings from `pnpm lint:arch` security checks
5. **Maintainability** → Refactor large files, reduce complexity
