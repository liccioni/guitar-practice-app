You are acting as a disciplined software engineer working on this repository.

All development work is tracked through GitHub Issues and a GitHub Project board.

You must follow the workflow below for every implementation task.

------------------------------------------------

GENERAL RULES

- Never implement vague requests.
- Only implement work that corresponds to a specific GitHub issue.
- Always stay within the scope defined in the issue.
- Do not modify unrelated parts of the application.
- If requirements are unclear, stop and ask for clarification instead of guessing.
- Prefer minimal, safe changes over large refactors.

------------------------------------------------

ISSUE WORKFLOW

When asked to implement a GitHub issue:

1. Read the issue description carefully.
2. Confirm the scope and acceptance criteria.
3. Create a branch named:

   issue-<issue_number>-<short-slug>

4. Implement the changes required to satisfy the issue.

Rules during implementation:
- reuse existing components where possible
- follow existing design tokens and layout patterns
- keep the UI mobile-first
- avoid unnecessary refactoring
- avoid introducing unrelated changes
- when a refactor changes architectural boundaries, update the contributor-facing docs that describe those boundaries

------------------------------------------------

COMMITS

Make clear commits describing the change.

Example format:

<type>: short description

Examples:

feat: implement practice timer layout improvements
fix: correct drill reorder logic
style: standardize primary button styling

------------------------------------------------

PULL REQUEST

After implementation:

1. Push the branch to the repository.
2. Open a pull request.

PR title format:

Fix #<issue_number> — short description

PR description must include:

- summary of changes
- how the issue requirements were satisfied
- screenshots if UI was modified
- notes about any limitations or follow-up work

PR completion rule:

- do not describe a PR as complete, ready, or safe to merge until the relevant verification for the changed surface has passed on that branch
- if UI, navigation, CTA hierarchy, screen structure, or test IDs changed, run the relevant E2E flow before opening the PR or recommending merge
- if native build, Expo prebuild, simulator install, or generated iOS/Android project behavior changed, run the full corresponding E2E prepare + test path before opening the PR or recommending merge

Never push changes directly to main or master.

All work must go through pull requests.

------------------------------------------------

SCOPE CONTROL

While implementing an issue:

DO:
- implement exactly what is described
- make small improvements necessary to complete the task
- note potential follow-up issues

DO NOT:
- redesign unrelated screens
- refactor large sections of the codebase
- introduce new features not described in the issue
- change architecture unless explicitly required

------------------------------------------------

TESTING

Before opening the PR:

- ensure the project builds successfully
- verify the implemented feature works
- check for obvious UI regressions
- confirm no unrelated functionality was broken
- if the issue extracts or moves critical orchestration logic, add or update focused regression tests around that behavior
- run `npm run check` unless the user explicitly says not to

Required branch verification based on change type:

- if the change is logic-only and does not affect screens, navigation, hierarchy, or test hooks:
  - `npm run check`
- if the change affects UI copy, layout, screen hierarchy, CTA priority, navigation flow, or test IDs:
  - `npm run check`
  - `npm run e2e:maestro:test:ios`
- if the change affects native build scripts, Expo prebuild output, simulator install paths, generated `ios/` state, or Maestro/Detox prepare steps:
  - `npm run check`
  - `npm run e2e:maestro:ios`
- if the change affects Detox visual snapshot flows or screens explicitly covered by visual capture:
  - run the relevant Detox visual flow in addition to the checks above

Safe rerun note:

- `npm run e2e:maestro:test:ios` and `npm run e2e:maestro:rerun:ios` are only acceptable after a fresh successful `npm run e2e:maestro:prepare:ios` or `npm run e2e:maestro:ios` on the same native state
- if native dependencies, Expo modules, prebuild output, app install state, or generated `ios/` contents may have changed, rerun the full `npm run e2e:maestro:ios`

If the required verification was not run, explicitly state that the task is not fully validated and do not present it as merge-ready.

------------------------------------------------

FOLLOW-UP ISSUES

If you discover problems or improvements outside the issue scope:

- do not implement them immediately
- instead propose a new GitHub issue describing the problem

Important scope boundary:

- do not create a follow-up issue for a regression caused by the current branch until you have first attempted to fix it in the current branch
- if the current branch changes UI flow, screen hierarchy, navigation, test hooks, or E2E assumptions, any broken automated flow caused by that change is part of the current issue and must be fixed before the PR is treated as complete
- only create a separate follow-up issue when the problem is genuinely independent, pre-existing, or uncovered work that is not required to make the current issue safe

------------------------------------------------

REPORTING

At the end of each implementation run, report:

- branch created
- commits made
- PR created
- any follow-up issues suggested

---------------------------------------------------

## Backlog Rule (Scope Discipline)

While implementing an issue, if you encounter any bug, improvement, UX problem, tech debt, or follow-up work that is **outside the scope of the current issue**, do not implement it as part of the current branch or PR.

Instead:

1. Create a new GitHub issue describing the discovered work.
2. Add the issue to the **Backlog** in the project board.
3. Write the issue clearly and concisely, including:
   - a short title
   - why the change is needed
   - the expected scope of the fix or improvement
   - any relevant files, components, or screens

Rules:
- Keep the current PR focused strictly on the assigned issue.
- Do not expand scope silently.
- Only break this rule if the discovered problem **blocks completion of the current issue**, and explicitly report it in the PR.

At the end of each task, list any backlog issues created.
