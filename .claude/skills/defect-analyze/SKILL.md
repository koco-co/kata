---
name: defect-analyze
description: 缺陷分诊三模式——收到异常堆栈、console 报错、HTTP 失败做 bug 根因分析；收到带冲突标记的文本做合并冲突解决；收到 diff、分支对或变更文件集做静态缺陷扫描。已登记的 ZenTao bug URL/bug ID 要生成回归用例时转 test-case。
---

# defect-analyze

按输入类型分流到四种模式，Markdown 是唯一正式报告源；bug、conflict、scan 和 hotfix 分别写入各自报告目录。提交前运行对应的报告 lint。

## 四种模式

| 输入 | 模式 | 报告落点 |
|---|---|---|
| 异常堆栈、console 报错、HTTP 失败 | bug | `analyses/bug-report/<yyyymm>/<slug>.md` |
| 带冲突标记（`<<<<<<<`）的文本 | conflict | `analyses/conflict-report/<yyyymm>/<slug>.md` |
| diff、分支对、变更文件集 | scan | `analyses/scan-report/<yyyymm>/<slug>.md` |
| ZenTao bug ID、bug-view URL 或缺陷描述 | hotfix | `analyses/hotfix-case/<yyyymm>/<slug>.md` |

## 各模式规则

**bug**：实际行为、预期行为、复现步骤、影响范围、根因五项分开陈述；根因要有日志、堆栈或代码位置支撑。需要查源码时用 `kata repos grep/show`。用户确认要登记进禅道时，先通过报告 lint，再用 `kata zentao create --report <report.md>` 创建。

**conflict**：给方案前先把冲突双方各自的意图和依据写清楚，再给合并建议与理由；不单边裁决。

**scan**：用 `kata scans create --project <项目> --repo <仓库> --base-branch <基线> --head-branch <目标>` 取 diff，或用 `--patch <patch>` 读取已有 patch（不想 fetch 加 `--skip-fetch`），逐文件静态审查；只报告能依据所给 diff 与周边代码证实的缺陷，每条带 `文件:行号` 与理由。

**hotfix**：用 `kata defects hotfix --bug-id <id> --project <项目> --yyyymm <yyyymm> --slug <slug>` 获取 Bug 证据并生成单条回归 Markdown；提交前运行 `kata defects lint --report <report.md> --exit-code`。不生成 YAML、XMind 或 exports。

## 通用

- 缺证据时不编造日志、负责人、模块或根因；每条结论可追溯到证据（`文件:行号`、日志原文、命令输出）。
- 报告是给人看的 md：结论先行、证据在后，不写过程流水账。
- 默认只读；源码修改、冲突解决、禅道登记均需用户另行授权。知识库写回失败不阻塞 Markdown 报告生成。
- 基础设施 connectivity 报告由 `infra-diagnose` 独立负责，不在本 Skill 的报告契约中。
