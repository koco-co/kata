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
2. **工作区操作**：按下方命令流执行，动手前先确认目录边界（见「目录边界」），确保产物落在 `workspace/{project}/` 之下。

## 工作区操作命令

flag 拼写以各命令 `--help` 为准。

- **自检 / 收尾**：`kata init-wizard verify` 输出环境检查状态表（Node、依赖、workspace、.env、插件、源码仓库）；前 4 项全 pass 才算环境就绪，failed 项按 detail 里的提示修。
- **自检骨架**：`kata create-project scan --project <name>` 对比当前骨架与目标，输出缺失的目录 / 文件 / 配置注册情况；`skeleton_complete` 与 `config_registered` 都为 true 即完整。
- **创建 / 修复**：先 `kata create-project create --project <name> --dry-run` 预览将创建什么，确认后改用 `--confirmed` 落盘；不带任一 flag 会拒绝执行并提示加 `--confirmed`。

## 目录边界

- 产物一律写入 `workspace/{project}/` 之下，不外溢到仓库其它位置。
- `workspace/{project}/.kata/repos/**` 是只读源仓库、也是事实来源：要改动须先取得用户明确确认，并在源仓库自己的工作区中操作，避免污染只读证据。
