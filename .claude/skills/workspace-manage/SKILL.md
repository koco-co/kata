---
name: workspace-manage
description: 回答 kata 能力/功能菜单/命令帮助类提问，或创建、初始化、自检、收尾、修复项目工作区。触发短语如「kata 能干嘛」「功能菜单」「初始化工作区」「自检/收尾工作区」。仅生成或编辑用例请转至 case-*；维护业务知识请转至 knowledge-curate；UI 自动化请转至 playwright-automation。
argument-hint: "<功能菜单 | init | 自检 | 收尾 | 修复>"
user-invocable: true
model: sonnet
effort: medium
---

# workspace-manage

统一管理 kata 项目工作区，分两种模式：**能力问答**按命令索引直接回答、不碰工作区；**工作区操作**（创建 / 初始化 / 自检 / 收尾 / 修复）动手前先确认目录边界，确保产物落在约定位置。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 生成或编辑 QA 用例 → case-draft / case-edit
- 维护业务知识 → knowledge-curate
- UI 自动化 → playwright-automation

## 工作流

1. **能力问答**：问 kata 能干嘛、功能菜单、某命令怎么用——按命令索引直接回答，不改动工作区。
2. **工作区操作**：init / 自检 / 收尾 / 修复前，先读 `references/project-layout.md` 明确目录边界与写入位置，再动手。

## 何时加载哪个文件

| 文件 | 何时读 | 作用 |
| --- | --- | --- |
| references/project-layout.md | 创建、自检或修复工作区前 | 目录边界和产物写入位置 |

## 目录边界

- 产物一律写入 `workspace/{project}/` 之下，不外溢到仓库其它位置。
- `workspace/{project}/.kata/repos/**` 是只读源仓库、也是事实来源：要改动须先取得用户明确确认，并在源仓库自己的工作区中操作，避免污染只读证据。
