---
name: workspace-management
description: 当用户要「初始化工作区」「新建项目工作区」「自检/修复工作区」时使用本 skill，负责创建、检查、修复 kata 项目工作区骨架。询问 kata 能力或命令用法时直接运行 `kata --help`，不走本 skill。
---

# workspace-management

本 skill 管理项目工作区骨架。动手前先确认操作对象位于 `workspace/<project>/` 下。

## 命令

- **检查**：运行 `kata project scan --project <项目>`，对比当前骨架与标准结构，列出缺失的目录 / 文件。
- **创建 / 补齐**：先运行 `kata project create --project <项目> --dry-run` 预览将创建的内容，确认无误后再改用 `--confirmed` 实际写入。
- **安全修复**：先运行 `kata project repair --project <项目>` 预览，确认无误后再改用 `--apply` 实际执行。该命令只修复缺失的生成项；遇到用户文件或类型冲突时立即停止。
- **环境配置**：运行 `kata env list|show|doctor` 管理平台环境（见 CLAUDE.md 本地配置节）。

## 边界

- 所有产物只写入 `workspace/<project>/`，不外溢到其他目录。
- 骨架的标准结构以 `kata project scan` 的对比结果为准，不要凭记忆在对话里罗列目录。
- 项目的权威元数据只读写 `workspace/<project>/project.json`，不使用全局项目注册表或根 `config.json`。
- 不直接手改 `config/env/` 下的平台配置；需要调整时改用 `kata env` / `kata env cookie` 命令操作。
