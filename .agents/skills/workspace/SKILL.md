---
name: workspace
description: 创建、检查、修复 kata 项目工作区骨架。触发短语如「初始化工作区」「新建项目工作区」「自检/修复工作区」。问 kata 能力或命令用法时直接用 `kata --help`，不走本 skill。
---

# workspace

目标：让 `workspace/<project>/` 骨架完整、符合标准结构。

## 命令

- **检查**：`kata project scan --project <项目>` —— 对比当前骨架与标准结构，列出缺失的目录 / 文件。
- **创建 / 补齐**：先 `kata project create --project <项目> --dry-run` 预览，确认后改用 `--confirmed` 写入。
- **环境配置**：`kata env list|show|doctor` 管理平台环境。

## 约束

- 产物只写 `workspace/<project>/` 内，不外溢。
- 骨架的标准结构以 `kata project scan` 的对比结果为准。
- 不手改 `config/env/` 里的平台配置（经 `kata env` / `kata env cookie` 命令操作）。
