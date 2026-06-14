# Contributing to kata

## Development Setup

```bash
bun install
cp .env.example .env
bun run type-check  # verify TypeScript
bun test            # verify tests
```

## Code Style

- Biome for formatting (`bun run lint`)
- Immutable patterns, no mutation
- Small focused files (200-400 lines, max 800)
- TypeScript with strict types

## Commit Convention

```
<type>: <emoji> <description>

标题行用英文，description ≤ 72 字符。
type/emoji 固定映射见 .claude/rules/project-workflow-rules.md。
```

## PR Checklist

- [ ] `bun run ci` passes (lint + type-check + test)
- [ ] New code has tests
- [ ] No hardcoded paths or secrets
- [ ] Workspace files use dynamic paths via `paths.ts`
