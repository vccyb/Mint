# Security Specifications

## Principles

1. **Defense in depth** — Multiple layers of security controls
2. **Least privilege** — Minimum necessary permissions
3. **Secure by default** — Default configurations should be secure
4. **Fail securely** — Errors should not expose sensitive information

## Requirements

### Input Validation
- Validate all inputs at system boundaries
- Use schema validation (e.g., Zod) for external data
- Sanitize before storage, escape before rendering
- Never trust client-side data

### Authentication & Authorization
- Auth logic in providers layer only
- Never roll your own crypto — use established libraries
- Token storage: httpOnly cookies for web, secure storage for mobile
- Principle of least privilege for all API endpoints

### Data Protection
- Encrypt data at rest and in transit
- PII must be identified and handled per policy
- Secrets in environment variables, never in code
- Log redaction for sensitive fields

### Dependency Security
- Run `pnpm audit` regularly
- Pin dependency versions
- Review changelogs before updating
- No arbitrary dependency installation without review

### Agent Security
- Agents must not have access to secrets in source code
- Agent actions should be auditable
- Sensitive operations require human confirmation
- Rate limit agent-initiated operations

### Code Review Checklist
- [ ] No hardcoded secrets
- [ ] Input validation at boundaries
- [ ] Proper error handling (no stack trace leakage)
- [ ] SQL parameterized queries
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection for state-changing operations
