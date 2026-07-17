---
name: case-edit
description: 拿到既有用例产物文件(.md/.xlsx/.csv/.xmind/.json)路径，编辑、同步、归档、标准化或在这些格式间转换，语义不变是底线。依 PRD/需求源产新用例改用 case-draft；只给需求功能目录路径/目录名改用 playwright-automation。
argument-hint: "<用例产物文件路径 .md/.xlsx/.csv/.xmind/.json>"
user-invocable: true
model: sonnet
effort: medium
---

# case-edit

编辑、同步、转换或标准化既有用例产物，在 Archive Markdown / XLSX / CSV / XMind / JSON 之间保持用例意图稳定。语义不变是底线。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 依 PRD/需求源产新用例 → case-draft
- 基于用例创建或运行 Playwright，或只给需求功能目录路径/目录名 → playwright-automation

## 工作流

1. 编辑诉求模糊时，先用一个澄清问题确认意图，再触碰用例语义。
2. 跨格式编辑/同步前读 `references/archive-xmind-sync.md`；通用单文件转换统一使用 `kata cases convert --input <file> --to <md|xlsx|csv|xmind|json>`，交付前按 `.claude/prompt/_shared/case-qa.md` 自审。
3. 子命令 `/case-edit apply-corrections` 写回批改时，读 `references/apply-corrections.md`，按 dry-run 三选一、写回、xmind 同步的顺序执行。

## 何时加载哪个文件

| 文件                                      | 何时读                            | 作用                                       |
| ----------------------------------------- | --------------------------------- | ------------------------------------------ |
| references/archive-xmind-sync.md          | 跨 MD/XLSX/CSV/XMind/JSON 编辑或导出前 | 字段保真、自审清单、同步契约               |
| references/apply-corrections.md           | 仅 `apply-corrections` 子命令     | 加载 corrections、dry-run、写回、同步      |
| .claude/prompt/_shared/case-format-sample.md | 需要用例节点格式参照时 | 格式样例（含 DQ 子集），不作事实来源 |
| .claude/prompt/_shared/case-qa.md         | 交付前自审（共享引用）            | Archive/XMind 字段一致性与可执行性维度     |
| `workspace/<project>/_shared/knowledge/modules/<module>.md` + `sites/<host>/dom-*.md` | 编辑涉及菜单/字段/规则语义/统计函数时 | 核对菜单·字段文案与规则语义事实，避免把错误用例「保真」搬运；存疑查 `source-repo-map.md` 指向的源码枚举 |

## 语义保真

- 原有语义必须完整保留。缺失的前置条件、步骤、预期不得凭空补造；取不到证据时标记为「待确认」。`case-edit` 只搬运和转换语义，不得创造新事实。
- 表单字段、按钮、Tab、下拉选项、枚举值必须逐字匹配证据原文：「sql」不得归一成「SQL」、「字段」不得写成「字段级」，也不得拿动作泛称替代按钮全称。
- 用户指定或历史标题中的业务括号（如「验证【规则名】...」）原样保留，不得按通用标题规则移除。
- 修复错误用例后，标题、前置条件、步骤、预期都要像新生成的用例那样直接陈述行为与结果，不得带「为什么这么改」的原因或差异说明（如「多字段 AND：...」前缀、「...单字段不计入」补语、SQL 注释里的推理旁白）。需要表达的语义靠测试数据与预期本身体现：让数据只命中目标行、预期只点中该行，而不是在正文里解释规则关系。

## 持续执行门禁

- 批量标准化必须按功能族逐条处理并逐条完成语义理解；格式转换、机械改写、结构校验或抽样检查不能代替逐条语义审查。
- 只要仍有可安全处理的用例，就继续下一个功能族，不得因为用例数量多、耗时长、上下文或 token 消耗、剩余数量、阶段性批次完成而停止，也不得询问用户是否继续。
- 单条用例受证据、权限或外部状态阻塞时，记录该用例及证据并继续所有不依赖该阻塞的用例；只有全部剩余用例都被同一真实阻塞卡住时才可停止。
- 批量标准化只有同时满足以下条件才算完成：全部声明用例已逐条审查；`kata cases lint --scope <feature-dir> --exit-code` 的 lint violation 为 0；Archive 校验通过；从最终 archive.md 重新生成 cases.xmind；Archive 与 XMind 的数量、优先级、标题、前置条件、步骤和预期完全一致。
- 最终回复前重新检查剩余清单和上述门禁；存在可执行的未完成项时必须继续处理，不得用进度汇报或后续建议代替执行。

## 交付自审

- 待修用例无论用户给的是 archive.md、cases.xmind 还是 CSV，archive.md 都是唯一编辑源；改完 archive.md 必须运行 `kata xmind generate --input cases/archive.md --output cases/cases.xmind --mode replace` 重新生成 XMind，使 md 与 xmind 两种格式都落到改动后状态。只改其中一种格式就交付，视为未完成。
- 历史 CSV/XMind 转 Archive 用 `kata history convert --path <csv-or-dir> --project <project> [--version <v>] [--filter <kw>]`（参数以 `kata history convert --help` 为准）。
- 单份用例文件格式转换用 `kata cases convert --input <file> --to <md|xlsx|csv|xmind|json> [--output <file>]`；格式由扩展名识别，默认拒绝覆盖，确需覆盖时显式加 `--force`。XMind 含多个需求根节点时仍使用 `kata history convert` 拆分归档。
- 交付前先运行 `kata cases lint --scope <feature-dir> --exit-code`，修复所有 violation 后再做人工自审。
- 自审 Archive 与 XMind 的用例数量、优先级、标题、前置条件、步骤、预期结果，确保完全一致；细则见 `references/archive-xmind-sync.md`。主动发现不一致，不得留给用户人工核对。
