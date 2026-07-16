# 自动化目录结构规范

本文件是 Playwright 自动化目录结构的单一权威规范。所有 agent prompt 和 lint 工具都必须以本文件为准，不得在各自文件中重复定义。

当本文件与任何其他文件出现冲突时，以本文件为准。

## Feature 根目录白名单

允许的条目（不区分顺序）：

| 条目 | 类型 | 说明 |
|------|------|------|
| `cases/` | 目录 | 用例产物（archive.md, cases.xmind, test-point-checklist.md） |
| `automation/` | 目录 | 自动化脚本 |
| `runs/` | 目录 | 运行结果（Allure、Playwright trace、handoff 等） |
| `inputs/` | 目录 | 输入材料（蓝湖截图、参考文档、CSV 等） |
| `metadata.yaml` | 文件 | Feature 元数据（FeatureMetadata@2） |
| `prd.md` | 文件 | PRD 文档 |
| `README.md` | 文件 | 可选说明 |

严格禁止出现在 feature 根目录：

- `*.ts` `*.json`（脚本和数据文件不属于这里）
- `results/`（应与 `runs/` 合并）
- `.debug/`（应放在 `automation/tests/.debug/`）

## automation/ 顶层

只允许 `tests/` 一个子目录。

严格禁止：

- `*.md`（AUTOMATION-PLAN.md、HANDOFF-*.md 等过程文档应放 `runs/` 或随 PR 归档）
- `*.json` `*.yaml`
- `runs/`（运行结果应在 feature 根 `runs/` 下）
- `scripts/`（共享脚本放 `_shared/`）

## automation/tests/ 子目录

只允许以下子目录：

| 目录 | 说明 |
|------|------|
| `cases/` | 用例脚本 |
| `runners/` | 聚合运行入口 |
| `data/` | 测试种子数据 |
| `unit/` | 单元测试 |
| `.debug/` | 调试用临时 spec |

禁止：

- `helpers/`（共享代码放 `_shared/`）
- `sql/`（seed SQL 放 `data/`）
- `MANUAL-TRIAGE.md`

## cases/ 命名规则

文件名格式：`t{nn}-{slug}.ts`

- `nn` 为两位数字，从 `01` 起编
- `slug` 为小写字母、数字、连字符组成的简短语义标识
- 完整正则：`^t\d{2}-[a-z0-9-]+\.ts$`

严格禁止出现在 `cases/` 下：

- `*.spec.ts`（spec 文件应放 `runners/` 或 `.debug/`）
- 文件名含 `-debug`、`-repro` 或 `diag_` 前缀（调试文件放 `.debug/`）

示例：

- `t01-login.ts` 合规
- `t02-create-quality-rule.ts` 合规
- `debug-helper.ts` 不合规（应放 `.debug/`）
- `login.spec.ts` 不合规（spec 只能放 `runners/` 或 `.debug/`）

## cases/ 索引

- `cases/README.md` 必须存在，枚举 `t{nn}` 到业务场景的映射
- 当 cases 文件数 >= 15 时，必须拆分为 >= 2 个模块子目录

## runners/ 白名单

只允许以下三个文件：

| 文件 | 说明 |
|------|------|
| `smoke.spec.ts` | 冒烟测试，聚合 P0 用例的 import |
| `full.spec.ts` | 全量回归，聚合全部用例的 import |
| `retry-failed.spec.ts` | 失败重跑，仅重跑上次失败的用例 |

严格禁止：

- 任何不在白名单中的 `.spec.ts` 文件
- 在 runner 中直接写 `test()` 或 `test.describe()` 体（runner 只能包含 import 语句）

## 共享代码位置

| 类型 | 路径 |
|------|------|
| 页面对象（Page Object） | `workspace/<project>/_shared/pages/` |
| 工具函数（Helper） | `workspace/<project>/_shared/helpers/` |

严格禁止：

- `automation/tests/helpers/`（feature-local helper）
- 在单个 case 文件中内联可复用的 page object 或 helper

## 禁止项总览

以下行为在任何情况下均被禁止：

1. debug/repro/diag spec 文件出现在 cases/ 或 runners/ 下（应放 `.debug/`）
2. feature 根目录存在 `.env.local`（应使用 `_shared/env/*.yaml` profile）
3. 出现 auth storageState、`.kata/auth` 或 `auth.session_path`；认证必须直接读取 env YAML 的 `auth.cookie`
4. automation/ 顶层出现 `.md` `.json` `.yaml` 文件
5. automation/tests/ 顶层出现 `t*.ts` case 文件（必须放 `cases/`）
6. 未在 `_shared/pages/` 或 `_shared/helpers/` 中定义 feature-local helpers
7. runner spec 文件直接包含 `test()` 体
8. `data/` 文件名含变体副本标记 `_vN` 或 `-N.ts`（应用 git history 追溯）
