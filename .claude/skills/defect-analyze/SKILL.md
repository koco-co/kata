---
name: defect-analyze
description: 缺陷分诊四种模式——收到异常堆栈、console 报错或 HTTP 失败时做 bug 根因分析；收到带冲突标记的文本时解决合并冲突；收到 diff、分支对、变更文件集或评审 / MR / PR 请求时做静态缺陷扫描；收到 ZenTao bug URL 或 bug ID 时生成 hotfix 回归报告。需要生成 YAML 回归用例时转 test-case。
---

# defect-analyze

按输入类型分流到四种模式；Markdown 文件是报告的唯一权威来源，提交前运行对应的报告 lint。

## 分流

| 输入 | 模式 | 报告路径 |
|---|---|---|
| 异常堆栈、console 报错、HTTP 失败 | bug | `analyses/bug-report/<yyyymm>/<slug>.md` |
| 带冲突标记（`<<<<<<<`）的文本 | conflict | `analyses/conflict-report/<yyyymm>/<slug>.md` |
| diff、分支对、变更文件集、评审 / MR / PR | scan | `analyses/scan-report/<yyyymm>/<slug>.md` |
| ZenTao bug ID 或 bug-view URL | hotfix | `analyses/hotfix-case/<yyyymm>/<slug>.md` |

## 模式规则

**bug**：实际行为、预期行为、复现步骤、影响范围、根因五项分开陈述；根因要有日志、堆栈或代码位置支撑。需要查源码时用 `kata repos grep/show`。报告结构以 [templates/bug-report.md](templates/bug-report.md) 为准，填写示例见 [examples/bug-report.md](examples/bug-report.md)。用户确认要登记到 ZenTao 时，先通过报告 lint，再运行 `kata zentao create --report <report.md>` 创建。

**conflict**：给出方案前，先把冲突双方各自的意图和依据写清楚，再给出合并建议与理由；不能只凭一方信息下裁决。报告结构以 [templates/conflict-report.md](templates/conflict-report.md) 为准；提交前运行 `kata defects lint --report <report.md> --exit-code`。

**scan**：用 `kata scans create --project <项目> --repo <仓库> --base-branch <base 分支> --head-branch <目标分支>` 取 diff，或用 `--patch <patch>` 读取已有 patch（不需要 fetch 时加 `--skip-fetch`），逐文件做静态审查；用户没给 diff 时先确认分支对，连分支对也没有时用 `git diff HEAD~1` 自取最近一次提交的 diff，并在报告中注明 diff 来源。只报告能由所给 diff 与周边代码证实的缺陷，每条都附 `文件:行号` 与理由。报告结构以 [templates/scan-report.md](templates/scan-report.md) 为准；提交前运行 `kata defects lint --report <report.md> --exit-code`。

**hotfix**：先用 `kata defects hotfix --bug-id <id> --project <项目> --yyyymm <yyyymm> --slug <slug> --evidence-file <evidence.json>` 获取 ZenTao Bug 证据，并把已经核对过的业务证据传入生成器，生成单条、字段固定、可直接对齐禅道的回归用例 Markdown。没有证据文件不得生成报告；生成后运行 `kata defects lint --report <report.md> --exit-code`。不生成 YAML、XMind 或 exports。

hotfix 用例必须遵守以下内容规范：

- 正文只允许禅道用例字段：用例标题、`前置条件`、`用例步骤`；不得出现 `Bug 证据`、`环境与前置条件`、`回归步骤与预期`、`验证状态` 等自定义章节。
- `用例步骤` 必须使用禅道同款 `编号 | 步骤 | 预期` 三列表格；步骤编号从 1 连续递增，每一步都有对应的非空、可验证预期。步骤和预期单元格必须保持单行；一个步骤包含多个表单项或结果时，仍放在同一个单元格内，用 `；` 分隔，不得换行或使用 `<br>`。
- frontmatter 是相对禅道唯一增加的内容，字段固定为 `type`、`bug_id`、`source`、`keywords`、`evidence_refs`、`problem_cause`、`fix_project`、`fix_branch`、`fixed_version`、`resolution`。`keywords` 按项目 hotfix frontmatter 规则保留 6 个 `|` 分段；`evidence_refs` 记录 ZenTao、知识库以及源码/已有用例/UI 证据。修复原因、修复工程、修复分支、修复版本和解决方案只从开发备注提取；备注没有提供时统一填空字符串 `""`，不得使用 `unknown`，不得推断或补写。
- `前置条件` 可以脱敏；账号、Cookie、Token、密码、数据源、库表、业务对象等真实值必须替换为 `${AccountA}`、`${DataSourceA}`、`${SchemaA}`、`${TableA}` 等占位符。不得把任何真实凭据写入报告、示例或禅道字段。
- `前置条件` 必须让不熟悉业务的执行人能够复现：写清环境/权限、业务对象的具体状态、对象之间的关联关系和异常数据；涉及数据状态时按 `workspace/<project>/_shared/rules/hotfix-prerequisites.md` 写可执行的 UI 准备步骤或完整 SQL。禁止“准备可返回较长失败信息的场景”“准备测试对象”“按 Bug 原始场景执行”等无法操作的描述。
- 生成前必须完成证据闭环：①读取 `kata knowledge read --project <project> --module <module>`，必要时用 `--keyword` 补查；②读取 ZenTao Bug 原文、步骤和开发备注；③用 `kata repos grep/show` 或本地源码检索确认实现语义；④检索同模块已有 YAML/Markdown/自动化用例，优先复用真实菜单、字段、对象和数据准备方式。不能由证据确认的业务事实不写入用例。
- `evidence_refs` 使用 `kind|path-or-url:line` 形式，至少包含 `zentao`、`knowledge` 和 `source`/`case`/`ui` 三类证据。证据只记录来源和行号，不把调试过程或敏感值写入正文。
- `kata defects hotfix` 的 `--evidence-file` JSON 必须包含 `keywords`、`evidence_refs`、`precondition` 和 `steps`；`steps` 中每项都必须有具体 `action` 与对应 `expected`。格式参考 [templates/hotfix-evidence.json](templates/hotfix-evidence.json)。生成器不再为缺失证据补通用前置、通用步骤或通用预期。
- 同步禅道时，正文按固定字段写入；frontmatter 只供本地追踪修复元数据，不把修复元数据混入步骤内容。

## 纪律

- 每条结论必须可追溯到证据（`文件:行号`、日志原文、命令输出）；禁止编造日志、负责人、模块、菜单、字段、数据状态或根因。
- 报告是写给人看的 Markdown：先给结论、后附证据，不写过程流水账；通用骨架见 [templates/report.md](templates/report.md)。
- 默认只读；修改源码、解决冲突、登记 ZenTao 均需用户另行授权。知识库没有命中时不得用猜测替代；应记录检索缺口并停止生成，除非已有源码、真实用例或用户确认足以支撑该事实。

## 边界

- 基础设施 connectivity 报告由 infra-diagnose 独立负责，不属于本 Skill 的报告范围。
