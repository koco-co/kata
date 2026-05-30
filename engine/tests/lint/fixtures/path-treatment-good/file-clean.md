Run `bun test --cwd engine`. Code is at `engine/src/lint/...`.
Output goes to `workspace/dataAssets/features/202604-foo/tests/`.
Use `kata case-edit edit --feature 202604-foo`.
The kata binary lives at `.claude/scripts/_shared/bin/kata` (canonical home after the bundle migration).
Run debris lint via `bun run .claude/scripts/lint/check-debug-files.ts`.
