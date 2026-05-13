# Core Beliefs — Agent-First Golden Principles

**Status:** Accepted
**Date:** 2025-01-01
**Origin:** OpenAI Engineering Blog — "Harnessing Codex in an Agent-First World"

These are the foundational beliefs that govern how we build software in an agent-first world.
Every architectural decision, tool, and process should be evaluated against these principles.

---

## Principle 1: The Repo is the Knowledge Boundary

> If the agent can't see it, it doesn't exist.

The agent's entire world is the repository. It cannot access Slack conversations,
verbal agreements, or tribal knowledge. Therefore:

- **All decisions must be documented in the repo** — not in wiki, not in Slack, not in someone's head
- **All context must be discoverable from AGENTS.md** — progressive disclosure from a single entry point
- **All constraints must be machine-enforceable** — if it matters, write a linter rule, not just a doc

**Implication:** If you find yourself explaining something to an agent that isn't in the repo,
that's a signal to add it to the repo.

---

## Principle 2: Progressive Disclosure

> Start with a map, not a 1000-page manual.

Agents, like humans, are overwhelmed by information overload. The solution is not
to dump everything into a single file, but to create a navigation structure:

- **AGENTS.md** — The entry point (~100 lines). Overview, links, and TL;DR rules
- **ARCHITECTURE.md** — The strict rules. Layer boundaries, dependency direction
- **docs/** — Deep dives organized by domain
- **Code comments** — Inline context for specific decisions

**Implication:** Documentation should be organized like a pyramid — broad overview at the top,
increasing detail as you go deeper.

---

## Principle 3: Enforce Invariants in Code

> Trust linters, not linguistics.

Documentation drifts. Code doesn't. If an architectural rule matters, encode it
in a tool that can mechanically verify it:

- **Dependency direction** → Custom linter rule
- **File size limits** → CI check
- **Naming conventions** → ESLint rule
- **Structured logging** → AST-based checker

Error messages from these tools should include **fix instructions** that the agent
can directly read and act upon.

**Implication:** If you're writing a doc that says "always do X," ask yourself:
"Can I write a linter rule for this instead?"

---

## Principle 4: Plans are First-Class Citizens

> An execution plan is a version-controlled artifact, not a fleeting conversation.

Non-trivial work should begin with a plan that lives in `docs/exec-plans/`.
Plans are:
- **Written before code** — They express intent
- **Updated during execution** — They track reality
- **Archived after completion** — They become institutional knowledge
- **Referenced in commits** — They provide context for changes

**Implication:** If an agent is about to make a 10-step change, it should write
a plan first, get alignment, then execute.

---

## Principle 5: Shared Tools First

> No disposable helpers. Centralize or don't write it.

One-off utilities are a smell. They duplicate, diverge, and decay. Instead:

- **All shared types** go in `packages/shared/`
- **All shared utilities** go in `packages/shared/src/utils/`
- **All shared constants** go in `packages/shared/src/constants/`
- **If two packages need it**, it belongs in shared

**Implication:** Before writing a helper function, check if shared already has it.
If not, add it to shared with proper typing and documentation.

---

## Principle 6: Boundary Validation

> No YOLO data exploration. Use typed SDKs.

When interacting with external systems (APIs, databases, third-party services):

- **Validate at boundaries** — Schema validation for all external data
- **Type everything** — External data gets typed immediately
- **Fail fast on malformed data** — Don't let bad data propagate through layers
- **Use Result types** — Don't throw exceptions for expected failures

**Implication:** Every API response, database row, and user input gets validated
before entering our type system.

---

## Principle 7: Encode Taste

> Human feedback → Documentation → Tool/Rule encoding.

The feedback loop for quality:
1. **Human reviews agent output** — Identifies patterns that are wrong
2. **Update documentation** — Capture the correct pattern
3. **Encode in tooling** — Write a linter rule or test that enforces it
4. **Agent follows automatically** — Next time, the tool catches it

This creates a virtuous cycle where the agent gets better over time without
requiring more human intervention.

**Implication:** Every code review should ask: "Is there a linter rule we could
write to prevent this class of issue in the future?"

---

## Living Document

These principles should evolve. When a new pattern emerges:
1. Discuss and agree on the principle
2. Update this document
3. Create enforcement tooling where possible
4. Reference this document in code reviews
