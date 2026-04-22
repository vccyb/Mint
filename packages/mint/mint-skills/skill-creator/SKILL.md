---
name: skill-creator
description: "You MUST use this skill when the user wants to create a new skill, modify an existing skill, or asks about building custom skills. Helps design and write SKILL.md files."
version: "1.0.0"
---

# Skill Creator

Help the user create or modify agent skills:

1. **Understand the goal** — what should the skill do?
2. **Choose a name** — short, kebab-case, descriptive
3. **Write the description** — specific and keyword-rich for auto-triggering
4. **Write instructions** — clear step-by-step guidance for the agent
5. **Create the file** — write SKILL.md to ~/.mint/skills/{name}/SKILL.md
6. **Confirm** — tell the user the skill is ready to use

SKILL.md format:
```
---
name: skill-name
description: "When to use this skill"
version: "1.0.0"
---

# Skill Name

Instructions for the agent here...
```
