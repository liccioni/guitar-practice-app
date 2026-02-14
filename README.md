# Project Spec Template

This folder is a reusable template for a spec‑driven, TDD‑first workflow. It includes:

- `docs/SPEC.md` — Single source of truth for behavior
- `docs/ACCEPTANCE_CRITERIA.md` — Definition of done
- `docs/PLAN.md` — Implementation roadmap
- `docs/PROGRESS.md` — Checklist mirroring the plan
- `docs/AUDIT_CHECKLIST.md` — Acceptance criteria audit checklist
- `docs/RELEASE_NOTES.md` — Tag summaries
- `docs/STARTUP_PROMPT.md` — Prompts for the next agent to fill in missing info
- `docs/EXAMPLE_FILLED.md` — A small filled example
- `docs/FIRST_TESTS_CHECKLIST.md` — TDD gate for the first tests

## How to Use
1. Copy the `spec_template` folder into your new project.
2. Fill out `docs/STARTUP_PROMPT.md` first to clarify intent and constraints.
3. Complete `docs/SPEC.md`, then `docs/ACCEPTANCE_CRITERIA.md`.
4. Break work into phases in `docs/PLAN.md`.
5. Track progress in `docs/PROGRESS.md` and audits in `docs/AUDIT_CHECKLIST.md`.

## Workflow Rules (Non‑Functional)
- TDD is mandatory: tests before implementation.
- Never loosen tests to accommodate broken behavior.
- Prefer design patterns where they clarify structure.
- Non‑generated code should use modern language features (e.g., Optional/Streams).
- Generated code should prioritize efficiency and minimal overhead.
- Keep docs in sync with implementation changes.
