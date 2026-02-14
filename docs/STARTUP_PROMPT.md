# Startup Prompt (Fill This First)

Use this as a checklist to initialize a new project. Answer each question clearly and keep it short.

## 1. Goal & Users
- What is the product/system supposed to do?
- Who is the primary user?
- What is the minimal successful outcome?

## 2. Inputs & Outputs
- What are the concrete inputs (files, APIs, data)?
- What outputs should be produced (files, APIs, behavior)?

## 3. Constraints & Non‑Functional Requirements
- Performance or scalability constraints?
- Language/runtime requirements?
- Tooling requirements (build system, testing framework)?
- Security/privacy constraints?

## 4. Behavior Rules
- Key mapping, data conventions, formatting rules?
- Error handling expectations?
- Edge cases that must be correct?

## 5. Test Strategy (TDD)
- What are the first 3 tests you would write?
- What fixtures or sample data are required?
- What integration test represents real usage?

## 6. Architecture Preferences
- Any required design patterns (Strategy, Factory, Adapter, etc.)?
- Any forbidden patterns or anti‑patterns?
- Generated vs hand‑written code boundaries?

## 7. Success Criteria
- How will we know it’s done?
- What must be true before tagging a release?

## 8. Risks & Open Questions
- What is unknown or risky?
- What could derail the plan?

---

## Optional: Default Decisions
If unanswered, these defaults will be used:
- Prefer simple, explicit APIs over cleverness.
- Use immutable data structures by default.
- Include comprehensive unit tests per class + one integration test.
