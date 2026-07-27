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

**hotfix**：用 `kata defects hotfix --bug-id <id> --project <项目> --yyyymm <yyyymm> --slug <slug>` 获取 Bug 证据，并生成单条回归用例的 Markdown 报告，结构以 [templates/hotfix-case.md](templates/hotfix-case.md) 为准；提交前运行 `kata defects lint --report <report.md> --exit-code`。不生成 YAML、XMind 或 exports。

## 纪律

- 每条结论必须可追溯到证据（`文件:行号`、日志原文、命令输出）；禁止编造日志、负责人、模块或根因。
- 报告是写给人看的 Markdown：先给结论、后附证据，不写过程流水账；通用骨架见 [templates/report.md](templates/report.md)。
- 默认只读；修改源码、解决冲突、登记 ZenTao 均需用户另行授权。知识库写回失败不阻塞 Markdown 报告生成。

## 边界

- 基础设施 connectivity 报告由 infra-diagnose 独立负责，不属于本 Skill 的报告范围。
