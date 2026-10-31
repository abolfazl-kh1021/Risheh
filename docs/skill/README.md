# docs/skill/ — Skill Manifest

This directory documents the skill sources requested by the project owner, their
licenses, and how they relate to this project. **Listing a skill here does not
"install" or activate anything** — skills are guidance references, not runtime
dependencies. See `SOURCES.md` for what was actually used and `INSTALLATION.md`
for how to wire them into a Claude session if desired.

## Relevance map (skill → project phase)

| Skill source | Relevant phase(s) | How it informed this build |
| --- | --- | --- |
| Anthropic Frontend Design | 1, 2 (foundation, storefront) | Component craft, accessible interaction patterns, visual polish |
| UI UX Pro Max | 1, 8 (design system review, QA) | Design-token discipline, responsive/RTL review checklist |
| Superpowers | all phases | Disciplined phased execution, verification-before-claiming workflow |
| Matt Pocock Skills | 4, 5 (TypeScript-heavy actions) | TS type-safety patterns for Server Actions / Zod pipelines |
| Docker Skills | 9 (deployment, optional) | Not used — Vercel is the target; containerization unnecessary |
| Everything Claude Code (ECC) | process reference | Session-continuity practices (mirrors the project's handoff protocol) |
| Perfect AI | QA/verification | Honest self-verification posture (no unverified "done" claims) |

## Files

- `SOURCES.md` — source URL, exact skill/folder, license, status (referenced vs copied)
- `INSTALLATION.md` — how to install/activate skills in a Claude environment
