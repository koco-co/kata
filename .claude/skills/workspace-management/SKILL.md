---
name: workspace-management
description: 创建、检查或修复 `workspace/<project>/` 下的 Kata 项目骨架，或管理项目使用的平台环境。用户提出初始化工作区、新建项目工作区、自检、补齐或安全修复时使用；只询问 Kata 能力或命令用法时直接运行 `kata --help`。
---

# Outcome

让指定项目符合 CLI 定义的工作区骨架，并以扫描结果证明写入范围准确、既有用户文件未被覆盖。

## Routing

- 检查现有项目：运行 `kata project scan`。
- 新建或补齐项目：执行 create 分支。
- 修复缺失骨架项：执行 repair 分支。
- 管理平台 URL、Cookie 或运行环境：转 `kata env` 命令，不修改项目骨架。
- 仅询问 Kata 能力或命令：运行对应的 `kata --help`，不执行本 Skill。

## Steps

1. 查明事实
   - 读取项目路径、CLI 模板和 `kata project scan --project <项目>` 输出，确认当前骨架、类型冲突和用户文件。
   - 不向用户询问可以从路径、扫描器或 CLI help 自行查明的事实。
   - 完成条件：项目唯一位于 `workspace/<project>/`，缺失项、冲突项和写入边界均已列出。

2. 确认关键决策
   - 只询问新建项目、应用修复以及不可恢复删除或冲突文件处理等会改变结果且无法从环境确定的决策。
   - 平台 URL、Cookie 和运行环境转交 `kata env`，不扩大为骨架修改。
   - 完成条件：create/repair 分支、确认开关和冲突处理方式明确。

3. 执行
   - create 使用 `kata project create --project <项目> --dry-run` 后按确认使用 `--confirmed`；repair 使用默认 dry-run 后按确认使用 `--apply`。
   - 完成条件：只创建缺失骨架项，不覆盖、重命名或删除既有用户文件，写入未越过项目目录。

4. 验证
   - 再次运行 `kata project scan --project <项目>`，并复核差异路径和类型。
   - 完成条件：`skeleton_complete` 为 true；仍有冲突时保持原文件不变并交付精确路径。

## Delivery

- 返回项目路径、创建或补齐的目录与文件、复核结果。
- dry-run 只报告计划，不表述为已写入。
- 发生冲突时列出精确路径和所需用户决策，不生成替代文件绕过冲突。

## Guardrails

- 所有骨架产物只写入 `workspace/<project>/`。
- 项目标识只取目录名，不创建 `project.json` 等重复元数据。
- 骨架标准只以 `kata project scan` 和 CLI 模板为准，不凭记忆补目录。
- 平台环境通过 `kata env list|show|doctor|add|cookie` 管理；不直接编辑 `config/env/` 私密文件。

## References

- 需要命令参数时读取 `kata project --help`、对应子命令 help 或 `kata env --help`。
- 骨架内容由 CLI 模板和扫描器维护，本 Skill 不复制目录清单。
