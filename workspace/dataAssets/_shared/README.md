# dataAssets 共享库（_shared）

dataAssets 项目所有 feature 共用的自动化基础设施。只有被至少两个独立 feature 复用的
页面对象、领域操作、fixture 或运行时能力才收敛到本目录；单 feature 能力必须留在
对应 feature 的 `automation/tests/{flows,assertions,fixtures,pages,sql}` 下。

## 目录结构

- `helpers/` — 仅保留跨 feature 复用的低层 UI/环境辅助：`env-setup`（URL/Cookie）、
  `batch-sql`（离线临时查询执行 SQL）、`metadata-sync`（元数据同步任务）、
  `preconditions` / `quality-project`（前置数据与项目准备）；不得放生成式用例执行器
  或某个 feature 的业务规则。
- `runtime/env-profile.ts` — 运行时环境入口。所有代码通过 `getEnvConfig()` 读取项目 ID、
  数据源与库名，禁止直读 `process.env` 里的废弃常量（由 `env-profile-lint.test.ts` 强制检查）
- `pages/` — 按 feature 分目录的页对象（见 `pages/INDEX.md`）；环境预置的业务 fixture 表
  登记在各 feature 目录的 `fixtures.ts` / `main-flow-fixtures.ts`
- `fixtures/` — Playwright fixture（如步骤截图）
- `rules/` — 项目级规则（覆盖仓库根 `rules/`）
- `_meta/` — 项目元数据（版本、客户、模块清单）

## 约定

- 项目 ID、数据源名、库名等环境相关取值一律来自 `getEnvConfig()`，不写硬编码字面量
- 环境预置的业务表/数据源显示名集中登记在对应 feature 目录的 `tests/fixtures` 模块
- `tests/runners/` 只保留 `generated.ts`、`full.spec.ts`、`smoke.spec.ts`、
  `retry-failed.spec.ts` 四种编排入口；正式可复用实现归入 `tests/` 对应领域目录。
  探测、排序、重查等一次性代码只可放未跟踪的 `runs/<run-id>/_tmp/`，禁止创建
  `automation/scripts/`。
- 自动化公共默认值只来自 `config/automation/playwright.yaml`；环境值来自
  `config/env/<env>.yaml` 的 `automation` 节点，临时覆盖统一使用 CLI `--set`
- 单元测试与各模块同目录（`*.test.ts`），运行 `bun run test:workspace`
