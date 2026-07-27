# dataAssets 共享库（_shared）

dataAssets 项目所有 feature 共用的自动化基础设施。feature 目录只放用例与 runner，
跨 feature 复用的页对象、helper、运行时配置一律收敛到本目录。

## 目录结构

- `helpers/` — UI 操作与环境辅助：`env-setup`（URL/Cookie）、`batch-sql`（离线临时查询执行 SQL）、
  `metadata-sync`（元数据同步任务）、`case-runner`（生成用例的步骤映射执行器）、
  `preconditions` / `quality-project`（前置数据与项目准备）
- `runtime/env-profile.ts` — 运行时环境入口。所有代码通过 `getEnvConfig()` 读取项目 ID、
  数据源与库名，禁止直读 `process.env` 里的废弃常量（由 `env-profile-lint.test.ts` 强制检查）
- `pages/` — 按 feature 分目录的页对象（见 `pages/INDEX.md`）；环境预置的业务 fixture 表
  登记在各 feature 目录的 `fixtures.ts` / `main-flow-fixtures.ts`
- `fixtures/` — Playwright fixture（如步骤截图）
- `rules/` — 项目级规则（覆盖仓库根 `rules/`）
- `_meta/` — 项目元数据（版本、客户、模块清单）

## 约定

- 项目 ID、数据源名、库名等环境相关取值一律来自 `getEnvConfig()`，不写硬编码字面量
- 环境预置的业务表/数据源显示名集中登记在对应 feature 目录的 fixtures 模块
- 单元测试与各模块同目录（`*.test.ts`），运行 `bun run test:workspace`
