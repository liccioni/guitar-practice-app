# First Tests Checklist (TDD Gate)

Before any production code changes, define and/or add these tests:

1. **Unit test for a core rule**
   - Example: key mapping or naming conversion.
2. **Unit test for a core generation/output**
   - Example: generated source or output file contains expected content.
3. **Integration test for real usage**
   - Example: run the primary pipeline end‑to‑end.

## Gate
- If these tests do not exist, do not start implementation.
- If they exist but fail, fix them before any new feature work.
