# Design Documents

This directory contains design documents that describe architectural decisions, patterns, and core principles.

## Index

| Document | Description |
|----------|-------------|
| [core-beliefs.md](./core-beliefs.md) | Agent-first golden principles and operating beliefs |

## Creating New Design Docs

When creating a new design document:
1. Use the naming convention: `kebab-case.md`
2. Add an entry to this index
3. Include a "Decision Date" and "Status" header
4. Reference related docs using relative links

## Template

```markdown
# [Title]

**Status:** Draft | Accepted | Deprecated
**Date:** YYYY-MM-DD
**Authors:** [name]

## Context
[Why this decision was needed]

## Decision
[What was decided]

## Consequences
[What are the trade-offs]
```
