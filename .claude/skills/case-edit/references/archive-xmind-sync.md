# Archive XMind 同步

跨 Archive Markdown、XMind、CSV 或标准化归档格式维护既有 QA 用例产物时，参照本文。

用例意图要在不同格式之间保持稳定，下列内容一律保留：层级、标题、前置条件、步骤、预期结果、标签、优先级，以及标识符（若存在）。目标格式无法直接承载某个字段时，把信息写到最近的显式备注或元数据字段，不得静默丢弃。

交付前必须主动自审，不得把格式、同步或业务规则缺陷留给用户人工发现。至少校验以下几项：

- Archive frontmatter `case_count` 与实际用例数一致。
- Archive 与 XMind 的版本/模块、需求、标题、优先级/marker、前置条件、步骤、预期逐条一致。
- XMind priority marker 分布符合预期。
- 旧术语、旧菜单名或用户指定的替换项没有残留。

用例级节点的下列格式细节，一律以 `.claude/prompt/_shared/case-qa.md`、`.claude/prompt/_shared/output-artifacts.md` 与 `.claude/prompt/_shared/case-format-sample.md` 当前 runtime 版本为准：

- 标题与括号语义；
- 前置条件 SQL 注释块；
- `${SchemaA}` 占位符；
- 步骤表格写法；
- XMind topic 镜像、priority marker、notes 约束；
- 数据质量「规则集 → 规则任务」前置链；
- 分区切换正负样本规则；
- 规则描述必填。

编辑诉求模糊时，先用一个澄清问题确认意图，再触碰用例语义。源产物冲突时，以用户指定的来源为准；没解决的分歧记入 pending items。

本 skill 不得依据 PRD 生成新的需求覆盖。从新的 PRD 生成用例，须路由至 case-draft。

## corrections 触发的同步

当 `/case-edit apply-corrections` 在写回阶段调用本同步契约时，xmind 节点定位以 `case-corrections.md` 中每条 correction 的 `case_ref` 字段为准：`case_ref` 形如 `cases/archive.md#L120 / cases/cases.xmind 节点 数据质量 > 概览 > P0-1`。本同步过程必须按「cases/cases.xmind 节点」分号后给出的节点路径直接定位 xmind topic，再把已修改的 archive 文本同步到该 topic 的 title/notes，不得重新解析 archive 全文反向推出映射关系。

同步前先给 cases/archive.md 存一份当时状态（可用 `git stash` 或临时副本）。若同步后 archive↔xmind 自检（数量、优先级、标题、前置条件、步骤、预期 6 项一致）失败，必须把 archive 改动回滚到这份存档，并在 apply-log 中标记 `failed_xmind_sync`，对应 correction status 不得置 applied。
