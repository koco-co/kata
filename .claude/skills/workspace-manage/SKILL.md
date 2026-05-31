---
name: workspace-manage
description: 展示 kata 功能菜单/命令帮助，或创建、自检、收尾、修复项目工作区。用户问 kata 能做什么、要 init/自检工作区时用。
when_to_use: 触发短语如「kata 能干嘛」「功能菜单」「初始化工作区」「自检/收尾工作区」。仅生成或编辑用例走 case-*；维护业务知识走 knowledge-curate。
user-invocable: true
model: sonnet
effort: medium
---

# workspace-manage

统管 kata 项目工作区：回答能力/菜单类提问，并确保创建、自检、收尾的产出都落在约定目录边界内。

## 路由边界

- 触发：询问 kata 能力/功能菜单/命令帮助；创建、初始化、自检、收尾或修复工作区。
- 改走：生成或编辑 QA 用例 → case-draft / case-edit；维护业务知识 → knowledge-curate；UI 自动化 → playwright-automation。

## 工作流

1. 能力/菜单类提问：按命令索引直接回答，无需改动工作区。
2. 工作区操作前先读 `references/project-layout.md` 厘清目录边界与写入位置，再创建 / 自检 / 收尾。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/project-layout.md | 创建 / 自检 / 修复工作区前 | 目录边界与产物写入位置 |

## 硬规则（不变量）

- 生成的产物一律写入 `workspace/{project}/` 之下。
- `workspace/{project}/.kata/repos/**` 为只读源仓库；需改动须先获用户明确确认，并在源仓库工作区内操作。
