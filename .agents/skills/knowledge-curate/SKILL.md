---
name: knowledge-curate
description: 用户要求查询、记录或维护项目业务知识、规则、术语或模块事实。
---

# knowledge-curate


证据事实必须引用 SourceRef ID。

## 路由摘要

- 查询与维护项目业务知识；知识统一沉淀于 workspace/{project}/knowledge/ 之下。

## 触发条件

- 用户希望记录、维护、更新或写入项目业务知识、规则或术语。
- 用户希望查询业务规则、术语、模块知识或项目业务概念。

## 不触发条件

- 用户只询问源码实现细节，不涉及业务知识的查询或更新。
- 用户要求生成或编辑用例、扫描代码变更，或做 UI 自动化。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| query_or_stage_update, commit_knowledge_update | `step.id in [query_or_stage_update, commit_knowledge_update] and outputs.ids contains entry` | references/knowledge-rules.md | 规范 | 查询或写入项目知识条目时，遵循知识库的分类规约与沉淀流程。 |

## 硬规则

- 项目知识统一存于 workspace/{project}/knowledge/** 之下。
- 未明确选定项目之前，不得跨项目编辑知识。
