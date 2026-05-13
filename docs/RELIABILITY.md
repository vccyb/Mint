# Reliability Engineering Requirements

## Principles

1. **Design for failure** — Every external dependency will fail eventually
2. **Graceful degradation** — Core functionality must work when non-critical services are down
3. **Observability** — Every action must be traceable through structured logs
4. **Circuit breakers** — Prevent cascading failures with timeouts and retry limits

## Requirements

### Error Handling
- All async operations must have explicit error handling
- Errors must be classified: Transient | Permanent | Unknown
- Transient errors: retry with exponential backoff (max 3 retries)
- Permanent errors: fail fast with actionable error message
- Unknown errors: log context, surface to operator

### Logging
- All logs must be structured (JSON format)
- Include correlation IDs for request tracing
- Log levels: DEBUG | INFO | WARN | ERROR | FATAL
- Never log sensitive data (PII, credentials, tokens)

### Health Checks
- Every service exposes a `/health` endpoint
- Health checks verify critical dependencies
- Degrade gracefully — report unhealthy but keep serving

### Testing
- Unit tests for all business logic
- Integration tests for critical paths
- No flaky tests — fix or remove immediately

### Deployment
- Zero-downtime deployments
- Feature flags for risky changes
- Rollback plan for every deployment
