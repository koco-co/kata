# kata CLI 与产物设计

**日期**：2026-07-10

**状态**：方向已确认，等待用户复核书面设计

## 目标

项目只保留一个公开命令 `kata`。所有命令采用相同的参数、帮助、输出、退出码和文件写入方式，让人和 Agent 都能稳定使用。

本设计同时解决现有 run ID、handoff、AutomationIntent、帮助文档和运行目录彼此不一致的问题。

## 单一入口

取消 `dtstack-cli` 的公开入口，其能力并入 `kata`：

```text
kata auth ...
kata db ...
kata project ...
kata env ...
kata plugins ...
kata skills ...
kata cases ...
kata automation ...
kata features ...
kata runs ...
kata workspace ...
```

旧的隐藏命令不再注册。典型迁移如下：

```text
xmind-gen        → kata cases export --to xmind
case-tasks       → kata automation tasks
results publish  → kata runs publish
handoff render   → kata runs handoff
paths audit      → kata workspace check
agents audit     → kata skills audit --runtime <name>
```

命令层级最多保持“命令组 + 动作”两级。确有子资源时可以增加第三级，但不得用深层命令弥补含糊的命名。

## 最终命令清单

下面是正式发行时允许出现的全部叶子命令。命令注册表以这份清单为边界；测试需要比较实际帮助与清单，任何未登记的公开或隐藏命令都应失败。

| 命令组 | 叶子命令 | 主要输入 | 是否写入 |
| --- | --- | --- | --- |
| `auth` | `login` | `--env`、用户名和密码来源 | 本地会话 |
| `auth` | `logout` | `--env` | 本地会话 |
| `auth` | `whoami` | `--env` | 否 |
| `db` | `exec` | `--mode`、连接目标、`--sql` 或 `--file` | 外部数据库 |
| `db` | `ping` | `--mode`、连接目标 | 否 |
| `project` | `ensure` | `--name`、owner、engine | 外部平台 |
| `project` | `setup` | 项目、数据源和 `--tables-from` | 外部平台与数据库 |
| `env` | `check` | `--env`、`--config` | 否 |
| `plugins` | `pack` | `--runtime`、`--ref`、`--output` | 安装包与发布清单 |
| `plugins` | `install` | `--runtime`、`--archive`、`--target` | 指定安装目录 |
| `plugins` | `check` | `--runtime`、`--archive` | 仅临时目录 |
| `skills` | `list` | 可选 `--runtime` | 否 |
| `skills` | `audit` | `--runtime` | 否 |
| `skills` | `route-check` | `--runtime`、`--fixture` | 否 |
| `cases` | `validate` | 功能目录或 `feature_id` | 否 |
| `cases` | `lint` | 可选功能目录 | 否 |
| `cases` | `compare` | `--left`、`--right` | 否 |
| `cases` | `verify` | 功能目录或 `feature_id` | 否 |
| `cases` | `export` | 功能目录、`--to markdown\|xmind\|csv` | 用例产物 |
| `cases` | `e2e` | `--fixture`、`--runtime` | 临时测试目录 |
| `automation` | `scaffold` | 功能目录 | 自动化骨架 |
| `automation` | `normalize` | 功能目录、`--apply` | 选择 `--apply` 时写入 |
| `automation` | `tasks` | 功能目录 | `CaseTaskList` |
| `automation` | `run` | 功能目录、用例选择、环境 | 新运行目录与外部平台 |
| `features` | `create` | 需求名称、项目、版本、可选需求 ID | 功能目录与 metadata |
| `features` | `list` | 过滤条件 | 否 |
| `features` | `show` | `feature_id` | 否 |
| `features` | `check` | 可选 `feature_id` | 否 |
| `features` | `index` | workspace 范围 | 索引文件 |
| `features` | `resolve` | 需求标识 | 否 |
| `features` | `archive` | 版本 | 归档目录与索引 |
| `runs` | `create` | 功能目录或 `feature_id` | 新运行目录 |
| `runs` | `publish` | 功能与 `run_id` | 当前运行状态与 Handoff |
| `runs` | `prune` | 功能、保留策略 | 选择 `--apply` 时删除 |
| `runs` | `handoff` | 功能与 `run_id` | `handoff.md` |
| `workspace` | `format` | 可选路径 | 选择非 dry-run 时写入 |
| `workspace` | `check` | 可选路径 | 否 |
| `workspace` | `clean` | `--dry-run`、`--plan <path>` 或 `--apply <plan>` | plan 时只写计划，apply 时迁移或删除 |
| `workspace` | `check-command` | `--` 后的 shell 命令 | 否 |

旧命令的处置固定如下：

| 旧入口 | 结果 |
| --- | --- |
| `agents audit` | 改为 `skills audit` |
| `paths audit` | 并入 `workspace check` |
| `safety audit-command` | 改为 `workspace check-command` |
| `results path/publish/prune` | 改为 `runs create/publish/prune` |
| `handoff render` | 改为 `runs handoff` |
| `features clean` | 并入 `runs prune` |
| `skills sync-check` | 删除；单一 Skill 树不再需要同步 |
| `features migrate` 与旧格式迁移命令 | 仅作为本次实施脚本，正式发行前删除 |
| `dtstack-cli` 全部命令 | 分别并入 `auth`、`db`、`project`、`env` |

`--format` 只控制 CLI 回应是 `text` 还是 `json`。生成用例的目标格式使用 `--to`，两者不得复用同一个参数名。

## 命令定义

每个公开命令都在 `packages/cli/src/commands/registry.ts` 的一个定义中声明：

- 名称和一句话用途；
- 输入参数、类型、默认值和允许值；
- 是否读取标准输入；
- 是否写文件；
- 是否允许 `--dry-run`；
- 文本结果如何呈现；
- JSON 结果使用哪个 schema；
- 可能返回的退出码；
- 可执行示例；
- 相关命令。

解析、帮助、文档和测试都从同一命令定义生成。README 不再手工维护另一份参数表。注册表同时生成机器可读的 `dist/command-registry.json`，测试用它核对最终命令清单。

## 帮助

帮助是公开接口的一部分。

### 根帮助

`kata --help` 包含：

- kata 的用途；
- 完整 usage；
- 全局参数；
- 所有公开命令组及一句话说明；
- 常用工作流示例；
- 退出码说明；
- 当前 CLI 与 schema 版本。

### 命令组帮助

例如 `kata cases --help` 包含：

- 该命令组解决什么问题；
- 全部子命令；
- 常见输入文件；
- 典型的前后调用顺序；
- 两至三个完整示例。

### 叶子命令帮助

例如 `kata cases export --help` 包含：

- 功能说明；
- usage；
- 必填参数；
- 可选参数、默认值和允许值；
- 输入文件与输出文件；
- 是否会创建、覆盖或删除文件；
- 文本与 JSON 输出说明；
- 退出码；
- 可直接执行的示例；
- 相关命令。

未知命令和参数应给出最接近的正确写法。不存在帮助中看不到的公开命令。

机器可以读取：

```text
kata help cases export --format json
```

帮助示例通过 fixture 或 `--dry-run` 实际执行。示例失效时测试必须失败。

## 输入方式

所有命令默认非交互运行。缺少必填参数时返回清楚的错误，不在半途打开问答。

只有初始化向导等明确场景才支持：

```text
--interactive
```

所有会写文件的命令支持：

```text
--dry-run
```

输出格式统一为：

```text
--format text
--format json
```

不再同时存在 `--json`、隐式 JSON 和文本混输。明确只想生成报告时，检查命令可以使用：

```text
--report-only
```

使用 `--report-only` 后，即使检查发现问题，进程也返回 0；JSON 中的 `status`、错误和计数保持原值。帮助需要提醒：CI 不应使用这个参数。

## 输出方式

- `stdout` 只输出最终结果；
- `stderr` 输出过程信息、警告和错误说明；
- JSON 模式只输出一个完整 JSON，不夹杂日志、颜色或进度文本；
- 文本模式在 TTY 中可以使用颜色，重定向时自动关闭；
- 所有写入结果都列出实际文件路径。

统一 JSON 结构：

```json
{
  "schema_version": 1,
  "command": "kata cases validate",
  "status": "passed",
  "data": {},
  "artifacts": [],
  "warnings": [],
  "errors": []
}
```

公共字段固定为：

```text
artifacts[]      { kind, path, sha256?, case_id? }
warnings[]       { code, message, details? }
errors[]         { code, message, details? }
required_input[] { field, prompt, choices? }
```

`message` 使用自然、可执行的文字，`code` 保持稳定。`details` 只能放结构化补充信息。JSON 默认不含堆栈；显式使用 `--verbose` 时，堆栈写入 `stderr`，仍不能混进 JSON。

## 退出码

| `status` | 退出码 | 含义 |
| --- | ---: | --- |
| `passed` | 0 | 命令完成且检查通过 |
| `failed` | 1 | 执行失败或检查未通过 |
| `invalid` | 2 | 参数、配置或输入格式错误 |
| `unavailable` | 3 | 环境、权限或外部服务不可用 |
| `needs_input` | 4 | 缺少必须由用户提供或选择的内容 |

检查命令发现问题时默认返回非零。`--report-only` 只改变 shell 退出码，不改变 JSON 中的实际 `status`。

命令处理函数不直接调用 `process.exit()`。它们返回结果或抛出统一错误，由 CLI 最外层决定输出和退出码。

## 用例文件名

需求名称经过一个共享函数转换为文件名主体。所有 Skill、CLI 和迁移脚本调用同一实现。

规则如下：

1. 先做 Unicode NFC 归一化；
2. 只保留 Unicode Han 字符、ASCII `A-Z`、`a-z` 和 `0-9`；
3. 删除所有空白和标点；
4. Markdown 与 XMind 使用相同主体；
5. 原始需求名称完整保存在 metadata 和文件内容中；
6. 清理后为空时使用 `需求` 作为主体；
7. 大小写不敏感文件系统上的比较键把 ASCII `A-Z` 转成小写，Han 字符和数字保持不变；
8. 重名时先把需求 ID 交给同一清理函数，再直接追加；需求 ID 为空或追加后仍重名时，追加稳定摘要；
9. 稳定摘要取 `SHA-256(feature_id + "\n" + NFC 原始需求名称)` 的前八位小写十六进制；仍冲突时依次扩展到十二位、十六位，直到唯一；
10. 最终主体以 180 个 UTF-8 字节为上限，截取时不得切断字符，并为已确定的需求 ID 或摘要预留长度；
11. 最终文件名再次通过允许字符、字节长度和大小写碰撞检查，任何一项不满足都返回 `invalid`，不得自行换用标点分隔。

示例：

```text
数据质量任务：支持规则 SQL 合并（第一期）
→ 数据质量任务支持规则SQL合并第一期.md
→ 数据质量任务支持规则SQL合并第一期.xmind

StarRocks 3.x 数据源适配
→ StarRocks3x数据源适配.md
→ StarRocks3x数据源适配.xmind
```

metadata 明确记录路径：

```yaml
artifacts:
  case_markdown: cases/数据质量任务支持规则SQL合并第一期.md
  case_xmind: cases/数据质量任务支持规则SQL合并第一期.xmind
```

正式命令只读取这两个字段。metadata 不存在或字段缺失时返回 `invalid`，列出缺少的文件或字段，不得扫描目录猜测文件。旧 `archive.md`、`cases.xmind` 和缺字段的 metadata 只由本次一次性迁移脚本处理；正式发行后不再提供旧格式回退。

## 公共数据结构

JSON Schema 是唯一来源，固定放在 `packages/contracts/schemas/v1/`。构建过程从 schema 生成 TypeScript 类型；手写类型不得与 schema 并存。所有持久化文件都有 `schema_version: 1`，文件名和 `$id` 同时包含版本。

核心字段如下。除 `requirement.id` 明确标为可选外，其余字段都必填：

| Schema | 核心字段 |
| --- | --- |
| `FeatureMetadata` | `schema_version`、`feature_id`、`project`、`version`、`requirement.id?`、`requirement.name`、`requirement.filename_stem`、`artifacts.case_markdown`、`artifacts.case_xmind`、`paths.feature_dir`、`paths.automation_dir` |
| `CaseDraft` | `schema_version`、`feature_id`、`requirement_name`、`source_refs[]`、`cases[]`、`open_questions[]` |
| `AutomationIntent` | `schema_version`、`feature_id`、`case_id`、`title`、`case_file`、`mode`、`status`、`steps[]`、`expected[]`、`ui_constraints`、`business_record.required` |
| `CaseTaskList` | `schema_version`、`feature_id`、`source_intents_sha256`、`tasks[]`；每个 task 包含 `case_id`、`intent_path`、`intent_sha256`、`output_spec`、`status` |
| `Run` | `schema_version`、`run_id`、`feature_id`、`created_at`、`commands[]`、`selected_case_ids[]`、`source_revision`、`status` |
| `RunResult` | `schema_version`、`run_id`、`status`、`case_counts`、`test_counts`、`case_results[]`、`artifacts[]`、`business_records[]`、`started_at`、`finished_at` |
| `Handoff` | `schema_version`、`run_id`、`status`、`commands[]`、`case_counts`、`test_counts`、`report_paths`、`business_records[]`、`excluded_cases[]`、`unresolved_blockers[]` |

公共枚举固定为：

```text
AutomationIntent.mode   read_only | mutating
AutomationIntent.status planned | ready | blocked | automated | excluded
CaseTask.status          planned | running | completed | blocked | excluded
Run.status              created | running | completed | failed | blocked
RunResult.status        passed | failed | blocked
Handoff.status          passed | failed | blocked
```

`case_counts` 使用 `declared`、`executed`、`passed`、`failed`、`skipped`；`test_counts` 使用 `collected`、`passed`、`failed`、`skipped`。两组分别核对，不能把一条用例映射出的多条 Playwright 测试混成同一个数字。每个 `case_results[]` 都要列出对应的 Playwright test ID。

`commands[]` 的每项固定包含 `argv[]`、`cwd`、`started_at`、`finished_at` 和 `exit_code`。Handoff 从 `run.json` 与 `result.json` 生成这些内容，不接受手工填写的命令摘要。

只读用例将 `business_record.required` 设为 `false`。会改变业务状态的用例必须在 `business_records[]` 中填写 `case_id`、`name` 或 `id` 中的至少一项、适用时的 `status`，以及与本次 run ID 关联的 `evidence_path`。缺少稳定身份或页面结果，就不能生成 `passed` 的 Handoff。

`report_paths` 固定包含 `run_json`、`result_json`、`handoff_json`、`handoff_markdown` 和 `allure_results`；生成 Allure HTML 时再增加 `allure_report`。所有路径相对于功能目录，写入前拒绝 `..` 和越界路径。

本次旧 schema 迁移直接写成 v1，不提供运行时多版本读取器。schema、生成类型、示例 fixture 和迁移输出要在同一测试中互相校验。

## 运行目录

所有自动化运行写入功能目录下的统一位置：

```text
<feature>/runs/<run-id>/
  run.json
  result.json
  handoff.json
  handoff.md
  allure-results/
  allure-report/
  screenshots/
  traces/
  work/
```

`run-id` 使用可排序的 UTC 时间和六位字母数字标识，例如：

```text
20260710T081530Z7K2M4Q
```

`kata runs create` 需要实际创建目录，并通过原子操作保证并发调用不会得到相同 ID。只计算路径而不创建目录的行为不再称为“分配”。

旧的 `_shared/published-reports/`、`<feature>/runs/<自由命名目录>/` 和带年月分层的运行目录都迁到上述结构。正式运行目录只能使用统一 run ID，不再接受手写名称。

`kata runs publish` 校验当前运行，生成 Handoff，并在 `run.json` 写入 `published_at` 与 `retention: pinned`。它不复制另一棵报告目录。`runs/` 不会被命令自动加入 Git；JSON、Handoff 和用户选定的附件可以提交，可重新生成的 Allure HTML 与 trace 默认忽略。发布状态只决定清理时是否保留，不代表文件已经提交。

## 命令测试

每个公开命令至少包含：

- 实际命令树与最终命令清单完全一致；
- 根帮助、命令组帮助和叶子帮助；
- 正确输入的文本输出；
- 正确输入的 JSON 输出；
- 缺少参数；
- 无效枚举；
- 业务检查未通过；
- 外部环境不可用；
- `--dry-run` 不写文件；
- 帮助示例可以执行；
- stdout、stderr 和退出码互不混淆。

需要增加跨模块流程：

```text
建立功能目录
→ 写入 metadata
→ 生成需求用例
→ 导出 XMind
→ 建立自动化运行
→ 写入结果
→ 生成 Handoff
→ 发布运行
```

该流程必须使用真实 schema 和真实 run ID，不能为每个测试单独捏造一套字段。`case_counts` 与 `test_counts` 分别满足：`declared = executed + skipped`、`executed = passed + failed`、`collected = passed + failed + skipped`。Handoff 中的数值必须与 `result.json` 完全一致。

## 迁移

1. 建立公共 CLI runner 和结果类型；
2. 合并 `dtstack-cli` 功能；
3. 建立新命令树和完整帮助；
4. 统一 schema 与 TypeScript 类型；
5. 实现用例文件名函数；
6. 统一运行目录和 run ID；
7. 编写只在本次实施中运行的旧 metadata、用例文件和运行结果迁移脚本；
8. 更新所有 Skill 和文档；
9. 迁移验证通过后删除实施脚本、旧入口和隐藏命令。

## 完成标准

- 只有 `kata` 一个公开可执行文件；
- 根帮助、命令组帮助和全部叶子帮助完整；
- 帮助中的示例实际通过；
- 所有公开命令支持一致的 text/json 输出；
- 退出码与错误类型一致；
- 不存在 action 内部直接 `process.exit()`；
- 用例 Markdown 与 XMind 使用同一需求名称主体；
- metadata 是用例文件路径的正常读取方式；
- run ID、Handoff 和运行目录使用同一规则；
- “命令测试”一节定义的跨模块流程实际执行通过；
- 实际命令树与“最终命令清单”逐项一致，没有额外的公开或隐藏命令。
