---
name: workspace-management
description: 创建、检查、修复 kata 项目工作区骨架。触发短语如「初始化工作区」「新建项目工作区」「自检/修复工作区」。问 kata 能力或命令用法时直接用 `kata --help`，不走本 skill。
---

# workspace-management

项目骨架管理。动手前确认操作对象是 `workspace/<project>/`。

## 命令

- **检查**：`kata project scan --project <项目>` —— 对比当前骨架与标准结构，列出缺失的目录 / 文件。
- **创建 / 补齐**：先 `kata project create --project <项目> --dry-run` 预览将创建什么，确认后改用 `--confirmed` 写入。
- **安全修复**：先 `kata project repair --project <项目>` 预览，确认后改用 `--apply`；只修复缺失的生成项，遇到用户文件或类型冲突立即停止。
- **环境配置**：`kata env list|show|doctor` 管理平台环境（见 CLAUDE.md 本地配置节）。

## 边界

- 产物只写 `workspace/<project>/` 内，不外溢。
- 骨架的标准结构由 `kata project scan` 的对比结果定义，以它为准，不在对话里凭记忆罗列目录。
- 项目正式元数据只读写 `workspace/<project>/project.json`，不使用全局项目注册表或根 `config.json`。
- 不手改 `config/env/` 里的平台配置（经 `kata env` / `kata env cookie` 命令操作）。
