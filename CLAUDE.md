# FitVault — Engineering Guidelines

## Test-Driven Development

All development on this project follows strict TDD. See global engineering standards in `~/.claude/CLAUDE.md`.

### Test Stack (React Native / Expo)

- **Unit + integration tests:** Jest + React Native Testing Library
- **Setup:** `mobile/jest.config.js` + `mobile/__tests__/`
- **Run tests:** `cd mobile && npm test`
- **Run with coverage:** `cd mobile && npm test -- --coverage`

### What Must Be Tested

| Layer | What to test |
|---|---|
| Services (`services/`) | All functions — success paths, error paths, edge cases |
| Context (`context/`) | State transitions, actions, initial state |
| Components | Render states (loading, error, empty, data), user interactions |
| Utils / helpers | All logic branches |
| AI service | Mock API responses — test parsing, platform validation, URL generation, fallbacks |

### Test File Conventions

- Place tests in `mobile/__tests__/` mirroring the source structure
- Name: `claudeService.test.ts`, `WorkoutContext.test.tsx`, `AIResultRow.test.tsx`
- Each new feature PR must include its tests

### Regression Rule

Before any commit: `npm test` must pass clean. A failing test is a blocker.

## Documentation Currency

Every session that adds, changes, or removes features must update all affected docs before committing — in the same commit as the implementation. There is no deferred docs pass.

**What to update per change:**

| Change | Update |
|---|---|
| New service / component / hook / module | Add to Key Files table in `docs/agent-instructions.md` |
| New or changed feature | Update feature list in `docs/agent-instructions.md` |
| Roadmap item completed | Check it off in `docs/ROADMAP.md` immediately |
| Test count changes | Update test count in `docs/agent-instructions.md` |
| New engineering rule | Add to this file or `~/.claude/CLAUDE.md` (global) |
