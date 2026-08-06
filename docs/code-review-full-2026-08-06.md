# Kata 全项目 Code Review 报告（2026-08-06）

> 审查基线：当前工作树（`/Users/poco/Projects/kata`，`main` 分支，含未提交改动）。
> 审查范围：架构结构、目录归属、排版格式、CLI/runtime/tests/config/workspace 第一方代码，以及当前可执行验证门。
> 结论：项目分层与目录策略总体清晰，但当前工作树存在多个可复现的 CI/交付阻断问题；其中部分问题会直接导致 `bun run check`、`type-check`、`workspace-discovery`、`cases lint` 失败。另有若干会导致归档运行目录被误删、知识索引写入错误类型、通知配置 fail-open 的真实逻辑风险。

## 1. 审查范围与基线

- 仓库约 1253 个跟踪/工作区文件，其中 `workspace/` 1004 个、`cli/` 182 个、`tests/` 81 个、`runtime/` 13 个。
- 第一方 TS 约 41727 行；工作区主要由 `dataAssets`（944 个跟踪文件）和 `batchWorks`（60 个跟踪文件）组成。
- 审查开始时已有 `docs/` 两条删除和部分 workspace 未提交改动；审查期间还观察到 `cli/lib/tui/index.ts`、`tests/cli/workspace-locator*.test.ts` 的未提交改动，视为并发工作，未覆盖、未回滚、未作结论性评级。
- 未运行真实 Lanhu、ZenTao、DTStack、业务平台 Playwright 全流程；只运行了本地单测、lint、类型检查和 Playwright discovery（`--list`）。

## 2. 验证矩阵

| 验证项 | 结果 | 摘要 |
| --- | --- | --- |
| `bun run check` | 失败 | 首个 `repo lint` 门即失败，violations=8 |
| `bun run type-check` | 失败 | 3 个 TS 错误 |
| `bun run type-check:workspace` | 通过 | 无输出错误 |
| `bun run test` | 通过 | 743 pass / 1 skip / 0 fail |
| `bun run test:tools` | 通过 | 87 pass / 0 fail |
| `bun run test:workspace` | 通过 | 9 pass / 0 fail |
| `bun run test:workspace-discovery` | 失败 | `v6411-ui-case-specs.ts` 读取不存在的 CSV |
| `bun run test:knowledge-lint` | 通过 | 0 violation |
| `bun run test:cases-lint` | 失败 | 936 violations |
| `bun run test:automation-lint` | 通过 | 424 feature files + 21 shared files，0 violation |
| `bun cli/bin/kata.ts config validate --exit-code` | 通过 | ok=true |
| `bun cli/bin/kata.ts config docs --check` | 通过 | ok=true |
| `bunx biome check .` | 通过（2 warnings） | 2 个测试 fixture 中 `${...}` 字符串警告 |

## 3. 架构与目录归属

### 3.1 总体判断

当前布局是清晰的：

- 根目录文件/目录由 `config/policies/repo-policy.yaml` 管控。
- `cli/` 下按 `commands/`、`lib/`、`integrations/`、`packages/`、`scripts/`、`templates/` 分层。
- `runtime/` 负责 Playwright 运行态、DB 客户端和 SQL 基础能力。
- `config/` 分为 policies、examples、automation、private，职责边界清楚。
- `workspace/<project>/` 统一承载 features、knowledge、analyses、_shared。

### 3.2 目录归属问题

- `cli/vendor/lanhu-mcp/.venv` 本地约 247M，虽被嵌套 `.gitignore` 忽略，但 `cli/` 目录整体被本地 venv 撑到约 248M；它不是版本库体积问题，却是本地依赖一致性和排障成本问题。
- `workspace/dataAssets/features/v6.4.11/【15862】.../runs/` 本地约 5.0G，约 869 个运行目录；属于被 `.gitignore` 忽略的本地产物，但会显著拖慢扫描、备份和 IDE 索引，建议按保留策略执行 `kata runs prune`。
- `runtime/automation/db/sql-split.ts` 与 `cli/packages/dtstack-sdk/src/core/sql.ts` 存在两套 SQL split 实现；`cli/lib/frontmatter.ts`、`cli/lib/knowledge.ts`、`cli/lib/prd.ts` 存在三套 frontmatter 解析实现。语义不完全一致，容易各自漂移。
- `cli/lib/automation/automation-normalize.ts:198-206` 把 `.DS_Store` 列为 feature 根目录允许项，与“仓库卫生”目标冲突；应视为待清理项而非允许项。

## 4. 真实缺陷

### R-001（高）`repo lint` 豁免路径与真实目录不匹配，`bun run check` 必失败

证据：

- `config/policies/repo-policy.yaml:108-110` 登记的是 `【岚图汽车】...` 目录，但实际目录名带需求 ID：`【15862】【岚图汽车】...`。
- `config/policies/repo-policy.yaml:113-116` 同样登记的是 `【岚图汽车】...lindorm/...`，实际目录名带 `【15889】`。
- 因此 6 个超过 800 行限制的存量文件没有被豁免，`repo lint` 报 8 条 violation。

`bun cli/bin/kata.ts repo lint --exit-code` 输出：

```text
workspace/dataAssets/features/v6.4.11/【15862】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并/automation/tests/fixtures/v6411-ui-case-specs.ts: 第一方源码 861 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15862】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并/automation/tests/flows/v6411-result-recheck-flow.ts: 第一方源码 1565 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15862】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并/automation/tests/flows/v6411-ui-rebuild-flow.ts: 第一方源码 4292 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15862】【岚图汽车】【数据资产】落标检查任务性能优化，规则sql合并/cases/imports/.gitkeep: .gitkeep 仅用于保留空目录；目录已有内容时必须删除
workspace/dataAssets/features/v6.4.11/【15889】【岚图汽车】【数据资产】数据资产适配lindorm/automation/tests/cases/c0032-view-tags.spec.ts: 第一方源码 947 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15889】【岚图汽车】【数据资产】数据资产适配lindorm/automation/tests/pages/data-quality/reports.ts: 第一方源码 1856 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15889】【岚图汽车】【数据资产】数据资产适配lindorm/automation/tests/pages/data-quality/rule-library.ts: 第一方源码 2140 行超过上限 800
workspace/dataAssets/features/v6.4.11/【15889】【岚图汽车】【数据资产】数据资产适配lindorm/automation/tests/pages/data-quality/settings.ts: 第一方源码 1658 行超过上限 800
[repository policy] violations=8
```

影响：所有 CI/本地 `bun run check` 无法进入后续 config、knowledge、cases、biome 门。

建议：将 `excluded_globs` 修正为真实目录，或改为不受需求 ID 影响的稳定 glob；删除 `【15862】落标检查.../cases/imports/.gitkeep`（同目录已有 CSV）。

### R-002（高）`type-check` 失败，CI 无法通过

证据：

```text
cli/lib/prd.ts(166,22): error TS2345: Argument of type 'string' is not assignable to parameter of type '"CL-001" | ...'
tests/cli/knowledge-cli.test.ts(520,29): error TS7006: Parameter 'e' implicitly has an 'any' type.
tests/cli/knowledge-cli.test.ts(536,30): error TS7006: Parameter 'e' implicitly has an 'any' type.
```

位置：

- `cli/lib/prd.ts:162` 用 `new Set(PRD_CHECKLIST_SEED.map(item => item.id))`，因 `PRD_CHECKLIST_SEED` 为 `as const`，`Set` 被推断为字面量联合；第 166 行用字符串检查时类型不兼容。修复应为 `new Set<string>(...)`。
- `tests/cli/knowledge-cli.test.ts:520` 和 `:536` 对 `JSON.parse(r.stdout)` 的结果直接调用 `.entries.map(...)`，需要显式类型。

影响：`tsc --noEmit` 无法通过。

### R-003（高）Playwright discovery 因硬编码 CSV 文件名失败

证据：

- `workspace/dataAssets/features/v6.4.11/【15862】.../automation/tests/fixtures/v6411-ui-case-specs.ts:90` 写死：
  `const CSV_PATH = path.join(FEATURE_DIR, "cases/imports/数据质量.csv");`
- 实际 `cases/imports/` 下文件为 `数据质量规则SQL优化.csv`。
- `loadCanonicalCsvRows()` 在 `v6411-ui-case-specs.ts:798` 读取该路径时抛 `ENOENT`。

`bun run test:workspace-discovery` 实际失败：

```text
Error: ENOENT: no such file or directory, open '.../cases/imports/数据质量.csv'
```

影响：`KATA_DISCOVERY_ONLY=1 playwright test --list` 直接失败，自动化用例发现门不可用。

建议：从 YAML 的 `meta.imports` 或实际归档文件解析 CSV 路径，禁止 fixture 硬编码具体导入文件名。

### R-004（高）`runs prune` 指定归档 feature 时会绕过“archived 不清”约束

证据：

- `cli/commands/runs.ts:123-129` 注释和批量分支都只清 active/standing，但 `featurePath` 分支直接 `findFeatureEntry(...)`，未过滤 `zone !== "archived"`。
- `findFeatureEntry` 可解析 `_archived/<version>/...`，随后 `planPruneForFeature` 会把这些归档 runs 纳入删除计划。

影响：用户显式传归档 feature 路径执行 `kata runs prune --apply` 时，可能删除归档运行证据，与代码注释和默认批量行为冲突。

建议：显式 feature 分支同样校验 `entry.zone !== "archived"`，或为归档路径提供独立、需确认的清理语义。

### R-005（中）`knowledge index` 会把 `knowledge/terms/*.md` 自动写成 `type: module`

证据：

- `cli/lib/knowledge.ts:319-327` 只识别 `/modules/`、`/pitfalls/`、`/sites/`、`/standards/`、`/customers/`、`overview.md`、`terms.md`。
- 当前规范使用 `knowledge/terms/<slug>.md`，该路径不匹配 `terms.md`，落入默认 `type = "module"`。
- 已用只读脚本复现：对路径 `.../knowledge/terms/foo.md` 调用 `autoFixFrontmatter`，输出 frontmatter 为 `type: module`。

影响：`kata knowledge index` 自动补 frontmatter 时会把 term 条目静默写成 module；随后 `knowledge lint` 报 entry-type 不匹配，或知识检索把 term 当 module 读取。

建议：增加 `filePath.includes("/terms/")` 分支，并补一条覆盖 `terms/` 目录的测试。

### R-006（中）通知配置对非法布尔值 fail-open

证据：

- `cli/lib/plugin-config.ts:237,240,246,250,254` 均使用 `booleanValue(...) ?? true`。
- 已用临时配置复现：`enabled: "maybe"` 会被解析成 `true`，而不是报错或禁用。

影响：私密通知配置一旦出现拼写/类型错误，例如 `enabled: maybe`，只要 `enabled_events` 已配置，就可能继续发送真实通知。项目对退役字段已 fail-closed，但对非法布尔值仍 fail-open，不一致。

建议：非 `boolean` 值应抛配置错误或按禁用处理；`enabledChannels` 同理。

### R-007（中）`repos show` 未校验 `refPath`

证据：

- `cli/commands/repos.ts:73-76` 直接把用户传入的 `refPath` 交给 `git show`。
- 同一文件中的 `grep` 对 `--ref` 和 path 分别调用 `safeRef`/`safeGitPath`；`repos show` 没有对应校验。

影响：输入以 `-` 开头时可能被 Git 解析为选项；虽然 `execFileSync` 不经过 shell，仍应显式拒绝，保持只读命令边界一致。

建议：复用 `safeRef`/`safeGitPath`，并校验格式为 `<ref>:<path>`。

### R-008（高/交付门）`cases lint` 当前基线 936 条违规

证据：

`bun run test:cases-lint` 输出 `cases lint: 936 violation(s)`，主要规则：

| 规则 | 数量 |
| --- | ---: |
| `case_title_condition` | 259 |
| `case_precondition_config_action` | 111 |
| `case_min_steps` | 49 |
| `case_schedule_form` | 42 |
| `case_block_scalar` | 30 |
| `case_sql_table_name` | 21 |
| `case_datasource_pair` | 21 |
| 其它 | 403 |

影响：`test:cases-lint` 是 `ci` 的一环，当前不能交付；同时说明业务用例历史存量与新增硬规则之间存在大规模未收敛。

建议：先按规则聚类修复，不要用批量脚本机械改写；修复时同步提升 lint 的定位信息（见 E-001）。

## 5. 交互/体验问题

### E-001（中）`cases lint` 对 936 条违规没有文件/用例/行号定位

证据：

- `config/policies/cases-lint.yaml:126` 明确“CLI 只汇总命中表达，不泄露文件、用例或行号”。
- 当前 `bun run test:cases-lint` 输出约 20 万字符，同一 feature 内每条违规都重复输出整段“标题: YAML用例存在违规内容”模板。

影响：规则有意不暴露定位，但当违规数量达到数百条时，人工无法低成本定位和修复，形成“知道不合法、不知道改哪里”的体验断点。

建议：增加 `--detail`/`--json` 模式，在显式选择时才输出文件、YAML case_id、字段和行号；默认摘要保留现状或仅输出一次规则说明。

### E-002（中）运行时 helper 继续使用固定等待，但自动化 lint 不扫描该目录

证据：

- `cli/lib/automation/automation-lint.ts:381-391` 定义了 `no-wait-timeout` 规则。
- `resolveTarget`（`automation-lint.ts:453-490`）只扫描 feature `automation/tests/` 或 `_shared/automation`，不扫描 `runtime/` 和 `cli/packages/dtstack-sdk`。
- `runtime/automation/playwright/ant-design/interactions.ts:28,37,50,75,116,135` 和 `navigation.ts:34,38` 存在多处 `page.waitForTimeout`。
- `cli/packages/dtstack-sdk/src/adapters/execute-table.ts:177` 还使用 15 秒固定等待。
- `runtime/automation/playwright/utils.ts:24-27` 的 `waitForUiSettled` 对超时 `.catch(() => undefined)`，loading 始终不消失时也会继续执行。

影响：项目宣称“固定等待不是可靠同步契约”，但通用运行库仍在大量使用；规则和实际代码边界不一致，容易让新用例复制这些反模式。

建议：将 `no-wait-timeout` 扫描范围扩展到被 feature/shared 实际引用的 runtime 和 SDK 文件；`waitForUiSettled` 超时默认应失败或返回未稳定状态。

## 6. 流程/逻辑冲突

### F-001（低）`scans create` 不校验 `--patch` 与分支参数互斥

证据：

- `cli/commands/scans.ts:103-111`：只要 `--patch` 存在就进入 patch 分支，忽略同时传入的 `--repo/--base-branch/--head-branch`。
- 错误提示声称“与分支对二选一”，但没有实际互斥校验。

影响：用户同时误传参数时静默使用 patch，可能生成与预期基线不符的报告。

### F-002（低）`defects hotfix` 年月与 slug 校验弱于其它报告命令

证据：

- `cli/commands/defects.ts:141` 只校验 `/^\d{6}$/`，`202699` 会被接受。
- `cli/commands/defects.ts:174-179` 调用 `hotfixReportPath`，该函数未复用 `assertYyyymm`/`assertReportSlug`。
- 其它报告路径在 `cli/lib/paths.ts` 中均做日历月和 slug 校验。

影响：hotfix 报告目录可能落入非法 YYYYMM，或产生不符合 slug 规范的路径。

### F-003（低）linked worktree 的私有环境写入口与 local-first 规则可能冲突

证据：

- `cli/lib/config-paths.ts:137-141` 声明 linked worktree 私密配置 local-first、主工作树逐文件回退。
- `cli/lib/platform-env.ts:1157` 的 `env cookie set` 写入 `effectivePlatformEnvPath(...)`，即“有效路径”，而不是强制创建本地副本。

影响：在 linked worktree 中，若环境只存在于主工作树，`env cookie set` 会修改主工作树共享文件，而不是生成本地覆盖；需要明确这是共享写入还是 local override。

## 7. 排版与格式

- Biome 当前只报告 2 个 warning，均在 `tests/cli/cases-content-lint.test.ts` 的字符串 `${...}` 中；不阻断，但建议用模板字符串或显式忽略。
- `repo-policy.yaml` 的 excluded_globs 与实际目录名不一致属于格式/路径契约漂移，已列为 R-001。
- `.DS_Store` 在 feature 根目录被 `automation normalize` 明确放行，与 Git ignore 和仓库卫生目标冲突（见 3.2）。
- `cli/lib/cases/content-lint.ts:785-787` 中 `collectQualifiedEnvironmentValues` 的 `kind` 三元表达式两个分支都是 `"schema"`，说明 datasource/schema 区分逻辑从未真正落地，建议清理为常量或补上 datasource 分支。

## 8. 建议修复顺序

1. 先修 CI 阻断：R-001、R-002、R-003。
2. 再修破坏性/安全类问题：R-004、R-006、R-007。
3. 修知识索引类型错误：R-005。
4. 收敛用例存量违规：R-008，并按 E-001 增加可定位输出。
5. 处理体验与流程冲突：E-002、F-001、F-002、F-003。
6. 目录卫生：清理 `.DS_Store` 与本地 runs/venv 大目录，按策略保留基线/发布记录。

## 9. 未验证边界

- 未运行真实 Lanhu/Axure、ZenTao、DTStack 平台业务流程。
- 未运行真实 Playwright 用例，只运行 `--list` discovery；discovery 当前已因 R-003 失败。
- 未验证 live MySQL/Hive/SparkThrift 数据源连接。
- 未对 `config/private/` 内容做回显或泄露，仅使用文件路径和脱敏诊断。

