# 岚图已上线需求用例规范整理设计

## Context

目标产物是 `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md` 及其同名 XMind。当前 Markdown 含 1216 条用例，版本分布为 `v6.4.2`、`v6.4.3`、`v6.4.4`、`v6.4.5`、`v6.4.6`、`v6.4.8`、`v6.4.10`。用户要求参考 `workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-rule-task-44-cases.md` 的格式和规范，对已上线需求用例做轻量修整。

关键业务约束：`v6.4.8` 才增加「规则集管理」，因此 `v6.4.2` 到 `v6.4.6` 的历史数据质量规则任务类用例原本没有规则集管理链路；本次允许补齐这部分链路。全量用例都要做格式、内容和规范微调，但不重写业务范围，不新增脱离原始需求的测试点。

## Goals

- 全量整理 1216 条 Markdown 用例的标题、前置条件、步骤表格、预期断言和术语格式。
- 对数据质量规则任务相关历史用例补齐「规则集管理 → 规则任务管理导入规则包 → 调度属性 → 校验结果查询」链路。
- 以实际 DOM、已有 Playwright 页对象、前端源码、后端源码和项目知识库建立控件与流程证据基线。
- 同步更新 XMind，保持 Markdown 与 XMind 在标题、优先级、前置条件、步骤和预期上的一致性。
- 输出静态校验证据，明确说明已验证的是结构/一致性/证据引用，不冒称真实平台全流程执行通过。

## Non-Goals

- 不新增大范围业务测试场景。
- 不把 1216 条全部改造成参考文件那种完整 SQL 造数深度；只有规则任务管理类用例在需要时补齐可执行链路。
- 不改 Playwright 自动化脚本，除非后续实施计划明确要求。
- 不修改用户主工作区中的已有未提交改动。
- 不在证据不足时编造 DOM 字段、按钮、接口或后端行为。

## Sources Of Truth

- 格式硬规则：`.agents/skills/case-draft/rules/case-qa.md` 与 `.agents/contracts/output-artifacts.md`。
- QA 自检规则：`.agents/skills/case-draft/rules/case-qa.md`。
- 参考样例：`workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-rule-task-44-cases.md`。
- 目标产物：`workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md` 和 `.xmind`。
- DOM 与自动化证据：`workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md`、`workspace/dataAssets/_shared/pages/**`、目标 feature 现有 Playwright cases。
- 前端源码：`workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src`。
- 数据质量后端相关源码：优先查 `workspace/dataAssets/.kata/repos/customltem/dt-center-assets`；若数据质量实现证据不足，再查 `workspace/dataAssets/.kata/repos/dt-insight-web/dt-center-valid` 并在实施记录中标明使用原因。
- 项目业务知识：`workspace/dataAssets/_shared/knowledge/modules/data-quality.md`。

## Scope Rules

全量用例适用：

- H5 用例标题保留 `【Pn】` 优先级，去除机器标识和无意义前缀。
- 导航路径使用 `【模块 → 页面】`；按钮、字段、选项、页签、单据名称使用 `「」`。
- 每条用例保持 `> 前置条件`、代码块、`> 用例步骤`、三列表格结构。
- 步骤按页面或阶段拆行，不把多个页面混在一行。
- 预期使用 `1)`、`2)` 编号，避免“进入成功”“页面正常打开”作为唯一断言。
- 描述类字段如「规则描述」「备注」不得留空；预期需验证保存和回显。

数据质量规则任务类用例额外适用：

- `v6.4.2` 到 `v6.4.6` 中原本直接在规则任务管理添加规则的用例，改为先在规则集管理创建规则集和规则包，再在规则任务管理导入规则包。
- 不通过场景不得通过修改规则集期望值制造失败；规则集和规则包保持不变，通过任务分区、数据条件或执行对象变化制造正反对照。
- 用例若声明已存在规则任务，前置条件必须说明该任务来自规则集链路下已保存且可执行的任务。
- 字段、统计函数、调度属性、执行入口和结果状态文案必须能被 DOM、源码或知识库支撑；否则列为待确认问题。

## Architecture

实施分成四个独立单元：

1. Evidence Baseline
   - 扫描目标 Markdown，生成版本、模块、优先级、疑似问题类型清单。
   - 建立数据质量规则集/规则任务表单字段基线，记录证据文件和源码位置。

2. Markdown Normalizer
   - 基于结构化规则修改 Markdown。
   - 优先做机械化、安全的格式修正；对涉及业务链路的用例按证据基线微调内容。
   - 对不确定项插入统一待确认记录，不在正文中写猜测。

3. XMind Sync
   - 使用 `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/build-delivery-xmind.mjs` 从 Markdown 重建 XMind。
   - 保持 priority marker 与 Markdown 标题优先级一致。

4. Validation
   - 执行结构校验、计数校验、Markdown/XMind 一致性校验、过期术语扫描和数据质量链路扫描。
   - 若存在未确认问题，输出清单并停止在可交付的静态整理状态，不声明真实业务运行通过。

## Data Flow

`目标 Markdown + 参考样例 + 规范文件 + DOM/源码证据`
→ `问题清单和字段基线`
→ `规范化 Markdown`
→ `生成 XMind`
→ `静态 QA 校验报告`
→ `最终交付说明`

## Error Handling

- 证据冲突：以 live DOM 和当前前端源码优先；后端源码用于接口/枚举/存储语义佐证。仍冲突时列问题给用户确认。
- 缺少字段证据：不新增该字段，只保留原用例语义或标为待确认。
- XMind 生成失败：先修 Markdown 结构错误，再重跑生成脚本。
- 校验失败：修复对应 Markdown 或 XMind 同步问题后重跑；不得跳过校验。
- 目标文件出现非本次改动：只读确认差异来源，不回滚用户改动。

## Testing And Verification

本次可验证范围：

- Markdown 用例数仍为 1216。
- 各版本用例数量不因整理发生意外变化。
- H5 标题优先级分布可统计。
- 每条用例都有唯一 `> 前置条件` 和 `> 用例步骤`。
- 每条步骤表格为 `| 编号 | 步骤 | 预期 |` 三列。
- 数据质量规则任务类用例不再残留旧式“直接在规则任务管理添加规则但缺少规则集来源”的链路。
- XMind 与 Markdown 在标题、优先级、前置条件、步骤和预期上保持一致。

不验证范围：

- 不声明全部用例在真实平台执行通过。
- 不声明 SQL 前置在所有数据源真实执行通过，除非后续单独跑数据源验证。
- 不声明 Playwright 自动化覆盖了本次整理后的全部用例。

## Deliverables

- 更新后的 `岚图已上线需求主流程用例.md`。
- 由 Markdown 重新生成的 `岚图已上线需求主流程用例.xmind`。
- 如存在证据不足项，输出待确认问题清单。
- 最终说明包含执行命令、退出码、通过/失败/跳过统计和产物路径。

## Open Decisions

- 所有版本都做格式规范化，已由用户确认。
- `v6.4.2` 到 `v6.4.6` 的规则任务管理历史用例可补齐规则集管理链路，已由用户确认。
- `v6.4.8` 和 `v6.4.10` 已处于规则集管理存在后的版本，也要做格式规范化；只有确有链路缺失或术语错误时才调整业务步骤。
