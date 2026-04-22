---
name: find-skills
description: "Helps users discover available skills. Lists skill directories and presents results in a table."
version: "1.0.0"
---

# Find Skills

You are helping the user discover available skills in their environment.

## Steps

1. Use your **Read** tool to read the skill directory listing:
   - `<project-root>/mint-skills/` — built-in project skills
   - `~/.mint/skills/` — user-installed skills

2. For each skill directory found, read its `SKILL.md` file to get the `name`, `description`, and `version` from the YAML frontmatter.

3. Present the results in a table:

| Skill | Description | Status |
|-------|-------------|--------|
| brainstorming | Ideation and creative exploration | Active |

4. If the user provides a keyword, filter results to matching skills.

5. If no skills are found, tell the user they can create custom skills.
