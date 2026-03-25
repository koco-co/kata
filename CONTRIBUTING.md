# Contributing to kata

## Development Setup

```bash
bun install
cp .env.example .env
bun run --cwd engine type-check  # verify TypeScript
bun test --cwd engine             # verify tests
```

## Code Style

- Biome for formatting (`bun run lint`)
- Immutable patterns, no mutation
- Small focused files (200-400 lines, max 800)
- TypeScript with strict types

## Commit Convention

```
<type>: <description>

Types: feat, fix, refactor, docs, test, chore, perf, ci
```

## PR Checklist

- [ ] `bun run ci` passes (lint + type-check + test)
- [ ] New code has tests
- [ ] No hardcoded paths or secrets
- [ ] Workspace files use dynamic paths via `paths.ts`
