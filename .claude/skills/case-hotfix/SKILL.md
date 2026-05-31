---
name: case-hotfix
description: 拿到 bug ID、ZenTao bug URL(zenpms.dtstack.cn/bug-view-NNN) 或修复说明，要产出聚焦修复路径的单条 hotfix 回归用例(可直接执行的 archive.md)时用。
when_to_use: 给出 bug ID、issue URL、缺陷描述或修复说明时用；含只发 zenpms.dtstack.cn/.../bug-view-NNN.html URL 或 bug ID、零文字也直接触发。要通用 bug 报告或依 PRD 产用例的不在此。
argument-hint: "<ZenTao bug URL | bug-view-NNN | bug ID>"
user-invocable: true
model: sonnet
effort: medium
---

# case-hotfix

以 bug 记录为输入，产出一条聚焦修复路径、可直接交付执行的 hotfix 回归用例。

## 路由边界

- 触发：bug ID、issue URL、缺陷描述、修复说明，或仅 ZenTao bug URL/bug-view/bug ID（未明说 hotfix 也算）。
- 改走：要基于原始失败证据写通用 bug 报告 → defect-analyze；依完整 PRD 产用例 → case-draft。

## 工作流

1. 抓取 bug 证据，定位修复路径与受影响页面/字段。
2. 写 archive 前读 `references/hotfix-archive-format.md`（目录、frontmatter keywords、前置条件 SQL、Spark 边界等全部细则）。
3. 输出独立 hotfix 目录：一个 archive.md + source_refs.json + .temp/；交付前按 `.claude/prompt/_shared/case-qa.md` 自审。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/hotfix-archive-format.md | 写或复核 archive 前 | 目录/frontmatter/keywords/前置条件 SQL/Spark 全分区等可执行格式 |
| .claude/prompt/_shared/case-qa.md | 交付前自审 | Archive 字段一致性、标题、前置条件可执行性 |

## 硬规则（不变量）

- 一个 hotfix archive 只含 1 条用例：覆盖修复路径本身，相邻回归风险点并入同一条用例的步骤或预期检查，不拆套件——hotfix 要的是窄而准的回归点，不是全量覆盖。
- 必须输出可直接执行的 archive.md（前置条件 + 步骤表），不得只给缺陷分析/原因说明/自然语言总结。
- 范围未定的问题一律入 `pending_items`，不外延到证据没支撑的模块/数据源/版本。
- 页面路径、按钮、字段 label、控件、交互入口必须有本次 bug 记录、源码、真实 DOM 探测或项目规则支撑；仅来自历史用例/规则时在 source_refs.json 标明来源与未验证边界，不冒充本次真实探测。
- 证据分层：archive.md 只留人类可读用例内容（不含任何 SourceRef 引用）；SourceRefs 只写本 hotfix 目录内的 source_refs.json；原始抓取证据只落本目录 .temp/，不写仓库根 workspace/.temp 也不写 .kata。
- frontmatter 必须含 zentao_url；目录命名 `hotfix_{fix_branch_or_bug_id}-{short-title}`；keywords 6 段、前置条件 SQL/Spark 写法等细则严格按 `references/hotfix-archive-format.md`，不在此重复。
