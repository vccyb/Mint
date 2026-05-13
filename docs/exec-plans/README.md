# Execution Plans

Execution plans are first-class artifacts. They live in version control and track the lifecycle of non-trivial work.

## Structure

```
exec-plans/
├── active/        ← Plans currently being executed
└── completed/     ← Plans that are done (archived for reference)
```

## Workflow

1. **Create** — When starting non-trivial work, create a plan in `active/`
2. **Execute** — Agent works through the plan steps
3. **Complete** — Move to `completed/` when done
4. **Reference** — Completed plans serve as institutional knowledge

See [PLANS.md](../PLANS.md) for the full plan workflow guide.
