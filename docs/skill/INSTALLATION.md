# docs/skill/INSTALLATION.md

## Context: how skills actually load in a Claude session

Skills are **instructions loaded at runtime**, not passive files. Putting documents in
`docs/skill/` does **not** activate anything by itself. Activation paths:

### A. Claude Code / Claude Desktop with Skills support

1. Skills live in a designated skills directory (commonly `~/.claude/skills/` for
   Claude Code, or the location configured for your deployment).
2. Install a skill by copying its skill folder (containing `SKILL.md`) there:
   ```bash
   # example
   git clone https://github.com/anthropics/skills /tmp/skills
   mkdir -p ~/.claude/skills
   cp -r /tmp/skills/skills/frontend-design ~/.claude/skills/frontend-design
   ```
3. Restart the session; the skill appears in the available-skills list and is invoked
   by name when relevant.

### B. Z.ai agent environment (this project's runtime)

The runtime has its own skill registry (e.g. the built-in `fullstack-dev` skill used
for this project). Requested third-party skills are **not registered** there; to use
one, either paste its `SKILL.md` content into the session as context, or register it
with your agent platform's skill mechanism if available.

### C. As project documentation (current state)

`docs/skill/` currently serves as a **reference manifest only** (see `SOURCES.md`).
The project's operating rules come from `CLAUDE.md` + `docs/*`, which take priority
over any skill instructions where they conflict.

## Skill → phase usage guide (when installed)

| Phase | Use |
| --- | --- |
| 1–2 (foundation/storefront) | `frontend-design` for component polish reviews |
| 8 (quality) | `ui-ux-pro-max` review checklist; `perfect-ai` verification posture |
| 4–5 (actions/orders) | `mattpocock/skills` TS/Zod patterns |
| any | `superpowers` for disciplined verify-before-done execution |
| 9 (optional) | `docker/skills` only if containerizing becomes necessary |

## Priority rule

Per `docs/reference/RISHEH_PROJECT_GUIDE.md` §10: skill instructions apply only when
consistent with the project guide, security requirements, and the user's explicit
requirements. **The project guide wins all conflicts.**
