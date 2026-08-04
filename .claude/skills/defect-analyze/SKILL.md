---
name: defect-analyze
description: 分析异常堆栈、console 报错和 HTTP 失败，裁决带冲突标记的文本，对明确指定的 diff、分支、MR 或 PR 生成静态缺陷扫描报告，或根据 ZenTao Bug ID/URL 生成 hotfix 回归报告。需要 YAML 回归用例时转 test-case；基础设施连通性问题转 infra-diagnose。
---

# Outcome

根据输入选择唯一缺陷分支，产出证据可追溯、可通过 CLI 校验的 Markdown 报告；只有用户明确要求时才进一步修改文件或写入外部系统。

## Routing

| 输入 | 模式 | 完整流程 | 报告路径 |
|---|---|---|---|
| 异常堆栈、console 报错、HTTP 失败 | bug | [workflows/bug.md](workflows/bug.md) | `analyses/bug-report/<yyyymm>/<slug>.md` |
| 带 `<<<<<<<` 等冲突标记的文本 | conflict | [workflows/conflict.md](workflows/conflict.md) | `analyses/conflict-report/<yyyymm>/<slug>.md` |
| 用户明确要求静态缺陷扫描/审查的 diff、分支对、变更文件集、MR、PR（生成 `analyses/scan-report/` 报告） | scan | [workflows/scan.md](workflows/scan.md) | `analyses/scan-report/<yyyymm>/<slug>.md` |
| ZenTao Bug ID 或 bug-view URL | hotfix | [workflows/hotfix.md](workflows/hotfix.md) | `analyses/hotfix-case/<yyyymm>/<slug>.md` |

生成 YAML 或 XMind 回归用例时转 `test-case`。服务器或数据源 connectivity 问题转 `infra-diagnose`。

## Steps

1. 查明事实
   - 读取当前输入、项目路径、所选 workflow 及其明确指向的模板、示例和证据文件。
   - 不向用户询问可以从输入、CLI、源码或已有记录自行查明的事实。
   - 完成条件：模式唯一，目标项目、报告路径和证据来源均已确定。

2. 确认关键决策
   - 只询问会改变修复范围、外部写入或报告发布状态且无法从环境确定的决策；默认保持只读分析。
   - 输入同时命中多个模式时，按用户明确交付物选择唯一 workflow。
   - 完成条件：分析、修改和外部写入边界明确，或已记录阻塞决策。

3. 执行
   - 完整执行所选 workflow；需要修复源码或解决冲突时只修改用户明确授权的本地范围。
   - 完成条件：workflow 的每项目标均已处理，无遗漏调用方或未声明的写入。

4. 验证
   - 对正式报告运行 `kata defects lint --report <report.md> --exit-code`，并复读报告中的证据与敏感信息边界。
   - 完成条件：lint 退出码为 0；否则交付精确证据缺口和阻塞原因，不发布不完整报告。

## Delivery

- 先给结论，再给证据、影响和建议；不输出过程流水账。
- 每条结论附文件行号、日志原文、命令输出或业务来源。
- 明确区分已证实缺陷、假设、未验证项和外部写入是否执行。

## Guardrails

- 默认只读。用户明确要求修复源码或解决冲突时，该请求才授权对应本地修改；登记 ZenTao 或其他外部写入必须单独明确。
- 不编造日志、负责人、模块、菜单、字段、数据状态或根因。知识无命中时继续查源码、真实用例或用户证据；仍不足则交付证据缺口。
- 报告是唯一分析权威；机械格式、占位符、空泛内容和敏感信息由 CLI lint 校验，不在各 workflow 重复维护。

## References

- bug：完整读取 [workflows/bug.md](workflows/bug.md)。
- conflict：完整读取 [workflows/conflict.md](workflows/conflict.md)。
- scan：完整读取 [workflows/scan.md](workflows/scan.md)。
- hotfix：完整读取 [workflows/hotfix.md](workflows/hotfix.md)。
