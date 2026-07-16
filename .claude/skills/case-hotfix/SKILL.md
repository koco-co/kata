---
name: case-hotfix
description: 拿到 bug ID、ZenTao bug URL（zenpms.dtstack.cn/zentao/bug-view-NNN.html）、缺陷描述或修复说明，产出聚焦修复路径、可直接执行的单条 hotfix 回归用例（archive.md）。仅发送 bug-view-NNN URL 或 bug ID 即可直接触发，无需附带文字说明。要基于失败证据写通用 bug 报告请转至 defect-analyze；依完整 PRD 产用例请转至 case-draft。
argument-hint: "<ZenTao bug URL | bug-view-NNN | bug ID>"
user-invocable: true
model: sonnet
effort: medium
---

# case-hotfix

以 bug 记录为输入，产出一条聚焦修复路径、可直接执行的 hotfix 回归用例；范围只锁定这次修复，不外延成完整功能用例集。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 基于原始失败证据写通用 bug 报告 → defect-analyze
- 依完整 PRD 产用例 → case-draft

## 工作流

1. 用 `bun run .claude/plugins/zentao/fetch.ts --bug-id <id> --output <hotfix>/.temp`（cookie 优先、失效自动登录）抓取 bug 证据；从返回 JSON 的 `fields`/`sections`/`history` 定位修复路径与受影响页面、字段。
2. 写 archive 前先读 `references/hotfix-archive-format.md`（目录、frontmatter keywords、前置条件 SQL、Spark 边界等全部细则）；涉及表单、规则配置、菜单路径或多子项步骤时，同步读 `.claude/prompt/_shared/case-format-sample.md` 头注释，继承 case-draft 的步骤可读性规则。
3. 输出独立 hotfix 目录：一个 archive.md，加 source_refs.json 和 .temp/；交付前按 `.claude/prompt/_shared/case-qa.md` 自审，且人工检查步骤是否像正式用例一样明确、可读、可逐项执行。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/hotfix-archive-format.md | 写或复核 archive 前 | 目录/frontmatter/keywords/前置条件 SQL/Spark 全分区等可执行格式 |
| .claude/prompt/_shared/case-format-sample.md | 写含表单/规则配置/多子项步骤的 archive 前 | 继承 case-draft 内容质量规则：步骤单页面、子项换行、预期编号、表单字段逐项列出 |
| .claude/prompt/_shared/case-qa.md | 交付前自审（共享引用） | Archive 字段一致性、标题、前置条件可执行性、表单逐字匹配 |

## 范围与格式

- 一个 hotfix archive 只含 1 条用例：覆盖修复路径本身；相邻回归风险点并入同一条用例的步骤或预期检查，不得拆成多个测试套件。
- Hotfix 用例标题固定使用 `##### 【{bug_id}】验证...`，不得添加 `【P0】`～`【P4】` 优先级；优先级 marker 只属于 case-draft 的需求用例。
- 用例正文中的数据源名、数据库/schema 名必须分别写成 `${DataSourceA}`、`${SchemaA}` 形式；多组环境依次使用 B、C，不得写真实环境名称。表名允许写具体名称。
- 只要正文给出具体表名，前置条件就必须提供与该表同名的最简可执行 `CREATE TABLE`；即使缺陷不限制字段或数据类型，也不得只写“已存在该表”。
- 范围未定的问题一律记入 `pending_items`，不得外延到无证据支撑的模块、数据源或版本。
- 必须产出可直接执行的 `archive.md`（含前置条件与步骤表），不得只给缺陷分析、原因说明或自然语言总结。
- Hotfix 用例的步骤质量必须与 case-draft 产出的正式用例一致：表单/规则配置不得写成一整句密文；每个字段、统计函数、期望值、强弱规则、规则描述等配置项独立成 `-` 列表项并用 `<br>` 分行；多条预期用 `1) 2) N)` 分行，确保 QA 可逐项执行和核对。
- 当 bug 记录截图、用户反馈或修复说明给出具体任务角色、数据流方向或任务类型（如“上游 DorisSQL 任务、下游数据同步任务”）时，archive 必须保留这些角色与方向；任务名可用占位符承接，但不得为方便造数替换成同质 SQL 任务、通用离线任务或其他 fixture。用户纠错补充的事实必须写入 `source_refs.json` 的 `user.feedback@N`。
- frontmatter 必须包含 `zentao_url`；目录命名 `hotfix_{fix_branch_or_bug_id}-{short-title}`；keywords 六段式、前置条件 SQL/Spark 写法等细则严格按 `references/hotfix-archive-format.md`，此处不再赘述。

## 证据与交付

- 交付前先运行 `kata archives validate --input <hotfix-dir>/archive.md` 校验结构、frontmatter、hotfix 标题、DataSource/Schema 占位符及具体表 DDL，修复所有 violation 后再做人工自审。hotfix archive 落在 `_shared/archive/issues/`，位于 `features/` 之外，`kata cases lint` 扫不到，故用 `kata archives validate`。SourceRef 泄漏校验不在此命令的覆盖范围内，需人工 grep 确认 `source_refs.json` 之外正文无结构化引用（`SourceRefs`、`bug.record@N`）。
- 页面路径、按钮、字段 label、控件、交互入口必须有本次 bug 记录、源码、真实 DOM 探测或项目规则支撑。仅来自历史用例或规则时，须在 `source_refs.json` 中标明来源和未验证边界，不得当作本次真实探测结果。
- 证据分层：
  - `archive.md` 只保留人类可读的用例内容，不含任何 SourceRef 引用。
  - SourceRefs 只写入本 hotfix 目录内的 `source_refs.json`。
  - 原始抓取证据只存放于本目录 `.temp/`，不写入仓库根 `workspace/.temp`，也不写入 `.kata`。
