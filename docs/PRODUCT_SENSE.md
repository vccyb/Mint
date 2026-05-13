# Product Sense — Principles & Decision Framework

## Core Product Principles

1. **Agent-first, human-steered** — Tools serve human intent, not the other way around
2. **Progressive complexity** — Simple things simple, complex things possible
3. **Transparency** — Agents should explain what they do and why
4. **Fail loudly** — Silent failures are the enemy of trust
5. **Reproducibility** — Every action should be reproducible from repo state

## Decision Framework

When making product decisions, consider:

### Impact vs. Effort
- **High impact, low effort** → Do immediately
- **High impact, high effort** → Plan and execute deliberately
- **Low impact, low effort** → Backlog
- **Low impact, high effort** → Don't do

### User Types
- **Developer** — Writing code, running agents, reviewing results
- **Architect** — Designing systems, setting constraints, defining quality gates
- **Operator** — Monitoring, debugging, maintaining production systems

Design features for the primary user type first.

## Feature Prioritization Questions

1. Does this reduce the cognitive load on the human operator?
2. Does this make agent behavior more predictable?
3. Does this improve the feedback loop?
4. Can this be enforced mechanically (linter, test, CI)?

If the answer to all four is "no," reconsider the feature.

## Trade-off Principles

- **Explicit > Implicit** — Prefer explicit configuration over magic
- **Compile-time > Runtime** — Catch errors as early as possible
- **Local > Distributed** — Keep related code together
- **Simple > Easy** — Simple means one way to do things; easy means many ways
