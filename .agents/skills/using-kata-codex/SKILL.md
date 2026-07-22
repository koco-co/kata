---
name: using-kata-codex
description: 在 Codex 会话开始时加载。按用户要完成的动作选择 Kata Skill；原生 Codex Skill 直接执行，尚未迁移的兼容 Skill 只做必要的工具语义转换。
---

# 在 Codex 中使用 Kata

先判断用户要完成的动作，再选择 Skill。不要只根据文件扩展名路由。

## 原生 Codex Skill

- `case-draft`：起草、补充或复核非自动化测试用例。
- `playwright-automation`：审查、生成、运行或修复 Playwright 自动化。

这两份 Skill 位于 `.agents/skills/**` 的真实目录。直接遵循其输入输出、安全边界和完成状态，不读取同名 Claude Skill 来补充固定流程。

## 兼容 Skill

其他业务 Skill 在完成 Codex 原生迁移前可能仍是指向 `.claude/skills/**` 的软链接。使用时保留业务合同，但忽略 Claude Code 专用的模型名、工具名和代理编排；用当前会话可用的读写、命令和检索能力完成同等动作。

工具差异见 `references/codex-tools.md`。只在使用兼容 Skill 且确实遇到工具名时读取该文件。

## 通用规则

- 先查看目标目录中更近的 `AGENTS.md`。
- 没有真实运行，不得写“通过”。
- 不展开、回显或提交秘密。
- 改变外部系统、删除共享数据、提交或推送前，确认用户已经明确授权。
- 机械检查优先调用项目 CLI；不要把检查器能完成的工作重复写成长篇提示词。
