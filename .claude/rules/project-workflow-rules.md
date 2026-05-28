# Project Workflow Rules

本文件承接 runtime 入口中的项目级工作规则。`AGENTS.md` 与 `CLAUDE.md` 只保留摘要；需要细节时按本文件执行。

## Git 工作流

- 默认在 `.worktrees/<slug>` 中工作，不在主工作树直接改代码。
- 合并回 `main` 前必须完成相关验证并说明已验证范围。
- 合并和推送前检查工作树状态，避免带入无关文件。

## 测试规范

- 代码、配置、runtime skill、入口文件或合同文档变更后必须运行相关测试。
- 测试失败必须先修复；不能把失败、跳过或未运行说成通过。
- 汇报验证结果时写清 exact command、exit code、passed/failed/skipped counts，以及未验证范围。

## 命名约定

- Feature 目录命名使用 `YYYY-MM[-{customer}]-{module}-{slug}`。
- slug 由小写字母、数字和短横线组成，表达模块和任务含义。
- 已有 feature 目录优先复用，不为同一需求创建平行目录。

## QA 产物自检

- Archive、XMind、CSV 等产物交付前必须检查字段一致性和可读性。
- 只声明本次实际生成或修改的产物；未生成的产物写入未验证范围。
- SourceRef 放置遵守对应 skill 的产物规范，不能把结构化证据泄漏进人类可读用例正文。

## 工作区边界

- `workspace/{project}/.kata/repos/**` 视为只读源仓库。
- 需要修改源仓库时，必须先获得用户明确确认，并在对应源仓库工作区内操作。
- 不把临时文件、调试输出或本地凭据写入项目入口文档或 runtime skill。
