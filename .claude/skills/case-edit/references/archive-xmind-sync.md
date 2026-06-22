# Archive XMind 同步

跨 Archive Markdown、XMind、CSV 或标准化归档格式维护既有 QA 用例产物时，参照本文。

用例意图须在不同格式间保持稳定，下列内容一律保留：层级、标题、前置条件、步骤、预期结果、标签、优先级及标识符（若存在）。目标格式无法直接承载某字段时，把信息写到最近的显式备注或元数据字段，不得静默丢弃。

交付前必须主动自审，不得把格式、同步或业务规则缺陷留给用户发现。先运行 `kata cases lint --scope <feature-dir> --exit-code` 覆盖机械检查（frontmatter 白名单、标题括号语义、SourceRef 泄露、机器文件位置等），修复所有 violation 后再做以下人工校验：

- Archive frontmatter `case_count` 与实际用例数一致。
- Archive 与 XMind 的版本/模块、需求、标题、优先级/marker、前置条件、步骤、预期逐条一致。
- XMind priority marker 分布符合预期。
- 旧术语、旧菜单名或用户指定的替换项没有残留。

用例级节点渲染格式（标题层级、前置条件代码块、步骤表格、XMind topic 镜像与 priority marker）由 `kata archive-gen` 和 `kata xmind-gen` 编码。内容规则（标题三段式、SQL 注释块、`${SchemaA}` 占位符、DQ 前置链、分区正负样本等）以 `.claude/prompt/_shared/case-qa.md` 与 `.claude/prompt/_shared/case-format-sample.md` 为准，不在此重复。

编辑诉求模糊时，先用澄清问题确认意图，再触碰用例语义。源产物冲突时以用户指定的来源为准；未解决的分歧记入 pending items。

本 skill 不得依据 PRD 生成新需求覆盖。从 PRD 生成新用例须路由至 case-draft。

## corrections 触发的同步

`/case-edit apply-corrections` 写回阶段调用本同步契约时，archive 全部 approved 条目改完后，用 `kata xmind-gen --input cases/archive.md --output cases/cases.xmind --mode replace` 整树重建 xmind（参数以 `kata xmind-gen --help` 为准）。

已知陷阱：`--mode replace` 按标题合并整树，若某条 correction 改了用例标题，旧标题节点会残留。改标题的 correction 需先删旧节点（参考 `kata xmind-gen --mode create` 重建），再做 replace。

同步前先为 cases/archive.md 存一份当时状态（可用 `git stash` 或临时副本）。若同步后 archive-xmind 自检（数量、优先级、标题、前置条件、步骤、预期 6 项一致）失败，必须把 archive 改动回滚到该存档，并在 apply-log 中标记 `failed_xmind_sync`，对应 correction status 不得置 applied。
