---
name: workspace-manage
description: 用户询问 kata 功能菜单、命令帮助，或要求创建、自检或收尾工作区。
---

# workspace-manage


证据事实必须引用 SourceRef ID。

## 路由摘要

- 统管 kata 项目工作区，确保产物落入预期位置。

## 触发条件

- 用户询问 kata 的能力、功能菜单、帮助内容或命令列表。
- 用户要求创建、初始化、自检、收尾或修复 kata 项目工作区。

## 不触发条件

- 用户希望生成 QA 测试用例，或编辑已有用例。
- 用户希望维护项目知识、扫描代码变更，或做 UI 自动化。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| inspect_workspace, plan_change, stage_workspace_update, verify_workspace | `step.id in [inspect_workspace, plan_change, stage_workspace_update, verify_workspace] and outputs.ids contains workspace` | references/project-layout.md | 规范 | 自检、创建或修复工作区时，先厘清目录边界与写入位置。 |

## 硬规则

- 所有生成的产物，写入 workspace/{project}/ 之下。
- workspace/{project}/.kata/repos/** 为只读源仓库；如需修改源仓库，必须先获得用户明确确认，并在源仓库工作区内操作。
