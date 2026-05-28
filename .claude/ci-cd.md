# CI/CD 说明

## 概览

Kata 使用 GitHub Actions 作为 CI 系统。所有 workflow 定义在 `.github/workflows/` 下。CI 覆盖 lint、测试、schema 校验和产物索引。

## CI 工作流

### 1. features-index

- **触发条件**: 推送 main 分支，且涉及 `workspace/**/features/*/metadata.yaml` 或 `manifest.json` 变更。
- **职责**: 自动重新生成 features 的 `INDEX.md`。
- **流程**:
  ```yaml
  - actions/checkout@v4
  - oven-sh/setup-bun@v2
  - bun install
  - kata features index --all
  - git commit + push (如果 INDEX.md 有变更)
  ```

### 2. features-lint

- **触发条件**: PR 涉及 `workspace/**/features/**`、`engine/src/lint/**`、`engine/src/cli/features-*.ts` 或 `.claude/contracts/schemas/**`。
- **职责**: 对所有 feature 目录执行 lint。
- **流程**:
  ```yaml
  - actions/checkout@v4
  - oven-sh/setup-bun@v2
  - bun install
  - kata features lint --all --exit-code
  ```

### 3. schema-check

- **触发条件**: 推送涉及 `.claude/contracts/schemas/**` 或 `engine/src/schemas/**`。
- **职责**: 运行 schema 相关单元测试。
- **流程**:
  ```yaml
  - actions/checkout@v4
  - oven-sh/setup-bun@v2
  - bun install
  - bun test engine/tests/schemas/
  ```

### 4. gitignore-no-bloat

- **触发条件**: 所有 push 和 PR。
- **职责**: 确保 `.gitignore` 有效行不超过 20 行（不含注释和空行），防止 `.gitignore` 膨胀。
- **流程**:
  ```yaml
  - 统计非注释非空行数
  - 超过 20 行时报错
  ```

### 5. migrate-script-removed

- **触发条件**: 所有 push 和 PR。
- **职责**: 禁止重新添加已删除的 migrate-v2 脚本。
- **流程**:
  ```yaml
  - 检查 engine/src/cli/migrate-v2/ 目录或 migrate-v2.ts、migrate.ts 是否存在
  - 存在时报错
  ```

## 本地测试命令

### 全量测试

```bash
bun test
# 等价于 bun test --cwd engine
```

### 局部测试

```bash
# 指定区域
bun test engine/tests/<area>

# Runtime 编排与契约检查
bun run check:skills

# Watch 模式
bun run test:watch
```

### Lint 检查

```bash
# Biome lint（所有文件）
bun run check
# Biome lint + 自动修复
bun run check:fix

# 独立 lint 命令
bun run lint              # Biome lint
bun run lint:debris       # 检查调试文件、过期路径、runtime 产物
bun run lint:agents       # Agent 审计（fail-only）
bun run lint:agents:claude  # Claude runtime agent 审计
bun run lint:agents:codex   # Codex runtime agent 审计
bun run lint:skills:codex   # Codex runtime skills 审计
bun run lint:paths        # 路径审计
bun run lint:cases        # 用例 lint（workspace scope）
```

### CI 全量命令

```bash
bun run ci
# 等价于依次执行：
#   bun run lint
#   + bun run lint:debris
#   + bun run lint:agents
#   + bun run lint:paths
#   + bun run check:skills
#   + bun run lint:agents:codex
#   + bun run lint:skills:codex
#   + bun run type-check
#   + bun test
```

### 类型检查

```bash
bun run type-check
# 等价于 tsc --noEmit
```

## Runtime skill 同步

修改 `.agents/**` 或 `.claude/**` 后，必须同步评估另一套 runtime 并运行：

```bash
bun run check:skills
```

`check:skills` 覆盖 runtime sync、detach、route、skill graph 和 workflow checks。

## 关键配置

| 配置项 | 路径 | 说明 |
|--------|------|------|
| Biome | `biome.json` | Lint 和格式化规则 |
| TypeScript | `tsconfig.json`, `tsconfig.base.json` | 类型检查配置 |
| Playwright | `playwright.config.ts` | E2E 测试配置 |
| 环境变量 | `.env`, `.env.local` | 运行时配置 |

## 依赖

- Runtime: Bun >= 1.3
- Node.js >= 22.0（Bun 兼容版本）
- CI 使用 `oven-sh/setup-bun@v2` action 安装 Bun
