---
name: case-edit
description: 拿到既有用例产物文件(.xmind/.csv/archive.md)路径，编辑、同步、归档、标准化或在 Archive·XMind·CSV 间转换，语义不变是底线。依 PRD/需求源产新用例改用 case-draft；只给需求功能目录路径/目录名改用 playwright-automation。
argument-hint: "<用例产物文件路径 .xmind/.csv/archive.md>"
user-invocable: true
model: sonnet
effort: medium
---

# case-edit

编辑或同步既有用例产物，让用例意图在不同格式之间保持稳定。语义不变是底线。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 依 PRD/需求源产新用例 → case-draft
- 基于用例创建或运行 Playwright，或只给需求功能目录路径/目录名 → playwright-automation

## 工作流

1. 编辑诉求模糊时，先用一个澄清问题确认意图，再触碰用例语义。
2. 跨格式编辑/同步前读 `references/archive-xmind-sync.md`；交付前按 `.claude/prompt/_shared/case-qa.md` 自审。
3. 子命令 `/case-edit apply-corrections` 写回批改时，读 `references/apply-corrections.md`，按 dry-run 三选一、写回、xmind 同步的顺序执行。

## 何时加载哪个文件

| 文件                                      | 何时读                            | 作用                                       |
| ----------------------------------------- | --------------------------------- | ------------------------------------------ |
| references/archive-xmind-sync.md          | 跨 Archive/XMind/CSV 编辑或导出前 | 字段保真、自审清单、同步契约               |
| references/apply-corrections.md           | 仅 `apply-corrections` 子命令     | 加载 corrections、dry-run、写回、同步      |
| .claude/prompt/_shared/case-format-sample.md | 需要用例节点格式参照时 | 格式样例（含 DQ 子集），不作事实来源 |
| .claude/prompt/_shared/case-qa.md         | 交付前自审（共享引用）            | Archive/XMind 字段一致性与可执行性维度     |

## 语义保真

- 原有语义必须完整保留。缺失的前置条件、步骤、预期不得凭空补造；取不到证据时标记为「待确认」。`case-edit` 只搬运和转换语义，不创造新事实。
- 表单字段、按钮、Tab、下拉选项、枚举值必须逐字匹配证据原文：「sql」不归一成「SQL」、「字段」不写成「字段级」，也不允许用动作泛称替代按钮全称。
- 用户指定或历史标题中的业务括号（如「验证【规则名】…」）原样保留，不按通用标题规则移除。

## 交付自审

- Archive 为编辑源时，修改完成后运行 `kata xmind-gen --input cases/archive.md --output cases/cases.xmind --mode replace` 同步 XMind。
- 交付前先运行 `kata cases lint --scope <feature-dir> --exit-code`，修复所有 violation 后再做人工自审。
- 自审 Archive 与 XMind 的用例数量、优先级、标题、前置条件、步骤、预期结果，确保完全一致；细则见 `references/archive-xmind-sync.md`。自动发现不一致，不留给用户人工核对。
