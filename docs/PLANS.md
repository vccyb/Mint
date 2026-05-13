# Plan Workflow Guide

## Overview

Plans are first-class citizens in this project. Every non-trivial change should have an execution plan before implementation begins.

## Plan Lifecycle

```
Draft → Active → Completed
                → Blocked → Active
```

## Creating a Plan

1. Create a new file in `docs/exec-plans/active/`
2. Use the naming convention: `YYYY-MM-DD-short-description.md`
3. Follow the plan template below

## Plan Template

```markdown
# [Plan Title]

**Created:** YYYY-MM-DD
**Status:** Active
**Priority:** Critical | High | Medium | Low

## Objective
[What this plan aims to achieve — one paragraph]

## Steps
1. [ ] Step one
2. [ ] Step two
3. [ ] Step three

## Dependencies
- [List any blockers or dependencies]

## Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Notes
[Any additional context]
```

## During Execution

- Check off steps as they complete
- Update status if blocked
- Add notes for unexpected discoveries
- Keep the plan updated — it's a living document

## Completion

1. Move from `active/` to `completed/`
2. Update any related docs
3. Check tech-debt-tracker.md for new items
4. Run quality scorer

## When NOT to Create a Plan

- Trivial fixes (typos, small config changes)
- Changes with a single obvious step
- Emergency hotfixes (create a retroactive plan if needed)
