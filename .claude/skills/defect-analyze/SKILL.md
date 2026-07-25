---
name: defect-analyze
description: 缺陷分诊三模式——收到异常堆栈、console 报错、HTTP 失败做 bug 根因分析；收到带冲突标记的文本做合并冲突解决；收到 diff、分支对或变更文件集做静态缺陷扫描。已登记的 ZenTao bug URL/bug ID 要生成回归用例时转 case。
---

# defect-analyze

按输入类型分流到三种模式，报告统一写 `workspace/<project>/analyses/<type>-<slug>/report.md`（结构见 [templates/report.md](templates/report.md)）。没有证据支撑的内容不写进报告。

## 三种模式

| 输入 | 模式 | 报告落点 |
|---|---|---|
| 异常堆栈、console 报错、HTTP 失败 | bug | `analyses/bug-<id或slug>/report.md` |
| 带冲突标记（`<<<<<<<`）的文本 | conflict | `analyses/conflict-<slug>/report.md` |
| diff、分支对、变更文件集 | scan | `analyses/scan-<slug>/report.md` |

## 各模式规则

**bug**：实际行为、预期行为、复现步骤、影响范围、根因五项分开陈述；根因要有日志、堆栈或代码位置支撑。需要查源码时用 `kata repos grep/show`。用户确认要登记进禅道时，再用 `bun .claude/plugins/zentao/create.ts` 创建。

**conflict**：给方案前先把冲突双方各自的意图和依据写清楚，再给合并建议与理由；不单边裁决。

**scan**：用 `kata scans create --project <项目> --repo <仓库> --base-branch <基线> --head-branch <目标>` 取 diff（不想 fetch 加 `--skip-fetch`），逐文件静态审查；只报告能依据所给 diff 与周边代码证实的缺陷，每条带 `文件:行号` 与理由。

## 通用

- 缺证据时不编造日志、负责人、模块或根因；每条结论可追溯到证据（`文件:行号`、日志原文、命令输出）。
- 报告是给人看的 md：结论先行、证据在后，不写过程流水账。
