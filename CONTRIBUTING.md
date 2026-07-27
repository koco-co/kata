# Contributing to kata

## Development Setup

```bash
bun install --frozen-lockfile
bun run type-check  # verify TypeScript
bun test            # verify tests
```

本机运行配置请使用 `config/env/`、`config/plugin/` 和 `config/infra/` 下的 ignored YAML；模板文件以 `.example.yaml` 结尾。仓库不自动加载根 `.env`。

## Code Style

- Biome for formatting (`bun run check`)
- Immutable patterns, no mutation
- Small focused files (200-400 lines, max 800)
- TypeScript with strict types

## 注释语言

- 公开 API 与类型定义（export 的函数/interface/type/class 的 JSDoc）：用英文。
- 内部实现注释（模块切分、步骤说明）：用中文。
- 分隔注释（`// ─── X ───`）：用中文。
- 同一文件内同一类注释不得中英混杂。

## Commit Convention

```text
<emoji> <type>: <description>

标题行用英文，description ≤ 72 字符。emoji 与 type 的对应沿用仓库历史：
✨ feat  🐛 fix  📚 docs  🎨 style
🛠️ refactor  🧪 test  🧹 chore  🔀 merge
```

## PR Checklist

- [ ] `bun run ci` passes (lint + type-check + test)
- [ ] New code has tests
- [ ] No hardcoded paths or secrets
- [ ] Workspace files use dynamic paths via `paths.ts`
