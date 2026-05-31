---
name: case-edit
description: 编辑、同步、标准化或在 Archive MD / XMind / CSV 间转换既有 QA 用例产物——语义不变是底线。给出已有用例产物路径时用。
when_to_use: 给出 XMind/CSV/Archive MD 用例路径，或要求修改/同步/归档/格式转换已有用例时用。依 PRD 产新用例 → case-draft；基于用例做自动化 → playwright-automation。
user-invocable: true
model: sonnet
effort: medium
---

# case-edit

编辑或同步既有用例产物，保持用例意图在格式间稳定——语义不变是底线。

## 路由边界

- 触发：对已有用例做修改/编辑/同步/标准化/归档/格式转换；给出 XMind、CSV 或 Archive MD 路径。
- 改走：依 PRD/需求源产新用例 → case-draft；基于用例创建或运行 Playwright → playwright-automation。

## 工作流

1. 编辑诉求模糊时，先用一个澄清问题确认意图，再触碰用例语义。
2. 跨格式编辑/同步前读 `references/archive-xmind-sync.md`；交付前按 `.claude/prompt/_shared/case-qa.md` 自审。
3. 子命令 `/case-edit apply-corrections` 落地批改时，读 `references/apply-corrections.md` 走 dry-run 三选一 → 回写 → xmind 同步。

## 何时加载哪个文件

| 文件                                      | 何时读                            | 作用                                     |
| ----------------------------------------- | --------------------------------- | ---------------------------------------- |
| references/archive-xmind-sync.md          | 跨 Archive/XMind/CSV 编辑或导出前 | 字段保真、自审清单、同步契约             |
| references/apply-corrections.md           | 仅 `apply-corrections` 子命令     | 加载 corrections → dry-run → 回写 → 同步 |
| references/fewshots/case-format-sample.md | 需要用例节点格式参照时            | 格式样例（含 DQ 子集），不作事实来源     |
| .claude/prompt/\_shared/case-qa.md        | 交付前自审                        | Archive/XMind 字段一致性与可执行性维度   |

## 硬规则（不变量）

- 原有语义完整保留；缺失的前置条件/步骤/预期不得凭空补造，取不到证据时标「待确认」。
- 表单字段、按钮、Tab、下拉选项、枚举值逐字匹配证据原文——「sql」不归一成「SQL」、「字段」不写成「字段级」、不用动作泛称替代按钮全称（QA 要照文案逐字核对）。
- 用户指定或历史标题里的业务括号（如「验证【规则名】…」）原样保留，不按通用标题规则移除。
- 交付前自审 Archive 与 XMind 的数量、优先级、标题、前置条件、步骤、预期一致；细则见 `references/archive-xmind-sync.md`，不把缺陷留给用户人工发现。
