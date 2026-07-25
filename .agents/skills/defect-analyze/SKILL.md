---
name: defect-analyze
description: 缺陷分诊三模式——收到异常堆栈、console 报错、HTTP 失败做 bug 根因分析；收到带冲突标记的文本做合并冲突解决；收到 diff、分支对或变更文件集做静态缺陷扫描。已登记的 ZenTao bug URL/bug ID 要生成回归用例时转 case。
---

# defect-analyze

目标：把缺陷证据变成一份可追溯结论的报告，写到 `workspace/<project>/analyses/<type>-<slug>/report.md`。

## 三种模式

- **bug**（异常堆栈、console 报错、HTTP 失败）：实际行为、预期行为、复现步骤、影响范围、根因五项分开陈述；根因要有日志、堆栈或代码位置支撑。查源码用 `kata repos grep/show`。用户确认要登记禅道时，再用 `kata zentao create --json <report.json>`。
- **conflict**（带 `<<<<<<<` 标记的文本）：给方案前先写清冲突双方各自的意图和依据，再给合并建议与理由；不单边裁决。
- **scan**（diff、分支对）：用 `kata scans create --project <项目> --repo <仓库> --base-branch <基线> --head-branch <目标>` 取 diff（不 fetch 加 `--skip-fetch`），逐文件审查；只报告能依据所给 diff 与周边代码证实的缺陷，每条带 `文件:行号` 与理由。

## 约束与完成标准

- 缺证据不编造日志、负责人、模块或根因；每条结论可追溯到证据。
- 报告结论先行、证据在后，不写过程流水账；结构：标题 / 结论 / 证据 / 分析 / 建议。
