---
name: case-hotfix
description: 拿到 bug ID、ZenTao bug URL（zenpms.dtstack.cn/bug-view-NNN.html）、issue URL、缺陷描述或修复说明，产出聚焦修复路径、可直接执行的单条 hotfix 回归用例（archive.md）。仅发送 bug-view-NNN URL 或 bug ID 即可直接触发，无需附带文字说明。要基于失败证据写通用 bug 报告请转至 defect-analyze；依完整 PRD 产用例请转至 case-draft。
argument-hint: "<ZenTao bug URL | bug-view-NNN | bug ID>"
user-invocable: true
model: sonnet
effort: medium
---

# case-hotfix

以 bug 记录为输入，产出一条聚焦修复路径、可直接交付执行的 hotfix 回归用例。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 基于原始失败证据写通用 bug 报告 → defect-analyze
- 依完整 PRD 产用例 → case-draft

## 工作流

1. 用 `bun run .claude/plugins/zentao/fetch.ts --bug-id <id> --output <hotfix>/.temp`（cookie 优先、失效自动登录）抓取 bug 证据；读返回 JSON 的 `fields`/`sections`/`history` 定位修复路径与受影响页面、字段。
2. 写 archive 前先读 `references/hotfix-archive-format.md`（目录、frontmatter keywords、前置条件 SQL、Spark 边界等全部细则）。
3. 输出独立 hotfix 目录：一个 archive.md，加 source_refs.json 和 .temp/；交付前按 `.claude/prompt/_shared/case-qa.md` 自审。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/hotfix-archive-format.md | 写或复核 archive 前 | 目录/frontmatter/keywords/前置条件 SQL/Spark 全分区等可执行格式 |
| .claude/prompt/_shared/case-qa.md | 交付前自审（共享引用） | Archive 字段一致性、标题、前置条件可执行性 |

## 范围与格式

- 一个 hotfix archive 只含 1 条用例：覆盖修复路径本身，相邻回归风险点并入同一条用例的步骤或预期检查，不拆分为多个测试套件。hotfix 追求精准的回归覆盖，不是全量测试。
- 范围未定的问题一律记入 `pending_items`，不外延到证据没有支撑的模块、数据源或版本。没有证据的外延只会把回归点稀释成猜测。
- 必须输出可直接执行的 `archive.md`（含前置条件与步骤表），不得只给缺陷分析、原因说明或自然语言总结。hotfix 的交付物是可执行回归，不是分析报告。
- frontmatter 必须包含 `zentao_url`；目录命名 `hotfix_{fix_branch_or_bug_id}-{short-title}`；keywords 六段式、前置条件 SQL/Spark 写法等细则严格按 `references/hotfix-archive-format.md`，此处不再赘述。

## 证据与交付

- 页面路径、按钮、字段 label、控件、交互入口必须有本次 bug 记录、源码、真实 DOM 探测或项目规则作为支撑。仅来自历史用例或规则时，须在 `source_refs.json` 中标明来源和未验证边界，不得当作本次真实探测结果。
- 证据分层：`archive.md` 只保留人类可读的用例内容（不含任何 SourceRef 引用）；SourceRefs 只写入本 hotfix 目录内的 `source_refs.json`；原始抓取证据只存放于本目录 `.temp/`，不写入仓库根 `workspace/.temp`，也不写入 `.kata`。
