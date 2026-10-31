# docs/skill/SOURCES.md — truthful manifest

**Status legend:** `referenced` = consulted the public repo/docs and applied its
principles only (no files copied); `copied` = files vendored into this project.

| # | Source | Exact skill/folder | License | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | https://github.com/anthropics/skills/tree/main/skills/frontend-design | `skills/frontend-design` | License as published in the anthropics/skills repo (check repo at install time; redistribution terms shown there) | **referenced** | Design-quality guidance (typography, color system discipline, component craft). No files copied — the project's design tokens come from the original Risheh archive, which takes precedence. |
| 2 | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | repo root skill | See repo | **referenced** | Used as a review lens for the design-system review checklist (tokens, spacing, RTL). No files copied. |
| 3 | https://github.com/obra/superpowers | repo root | See repo | **referenced** | Phased execution + "verify before claiming done" discipline; the project contract already mandates this, and the skill reinforces it. No files copied. |
| 4 | https://github.com/mattpocock/skills | repo root | See repo | **referenced** | TypeScript/Zod typing patterns for the Server Actions pipeline. No files copied. |
| 5 | https://github.com/docker/skills | repo root | See repo | **referenced (not applicable)** | Containerization not needed for the Vercel target; consulted and consciously skipped. |
| 6 | https://github.com/affaan-m/ECC | repo root | See repo | **referenced** | Cross-account session continuity practice (matches the project's own continuity protocol). No files copied. |
| 7 | https://github.com/realjustawall/perfect-ai | repo root | See repo | **referenced** | Honest verification posture. No files copied. |

## Why nothing was vendored

1. The project's own contract (`docs/reference/RISHEH_PROJECT_GUIDE.md` §10) forbids
   blind copying and requires license review before vendoring; licenses for several
   of these community repos were not re-verified at build time, so nothing was copied.
2. The runtime environment (Z.ai sandbox with its own `Skill` tool + fullstack-dev
   skill) already provides its own skill system; duplicating files here would not
   activate anything and would bloat the repo.

## How to vendor later (if the owner decides to)

1. Verify each repo's LICENSE file at the desired commit.
2. Copy only the specific skill folder(s) into `docs/skill/<name>/`.
3. Update this table: set status to `copied`, record the exact commit hash.
4. Follow `INSTALLATION.md` to wire them into the runtime skill directory.
