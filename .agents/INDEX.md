# Codex Runtime 命令索引

每行映射：command → skill → workflow 规范来源 → 主要产物。workflow 详情见 `.agents/contracts/workflows/`，skill 路由样例见 `.agents/contracts/routes/`，Codex 扩展配置见各 skill 目录的 `agents/openai.yaml`。

| Command | Skill | Workflow 规范来源 | 主要产物 |
| --- | --- | --- | --- |
| /workspace-manage | workspace-manage | - | 功能菜单、工作区状态 |
| /case-draft | case-draft | `.agents/contracts/workflows/case-draft.yaml` | archive.md、cases.xmind、metadata.yaml、manifest.json |
| /case-edit | case-edit | `.agents/contracts/workflows/case-edit.yaml` | archive、xmind |
| /knowledge-curate | knowledge-curate | - | 知识条目、查询结果 |
| /bug-file | bug-file | - | 缺陷报告 |
| /conflict-analyze | conflict-analyze | - | 冲突分析结论、解决方案 |
| /case-hotfix | case-hotfix | `.agents/contracts/workflows/case-hotfix.yaml` | archive、notes |
| /playwright-automation | playwright-automation | `.agents/contracts/workflows/playwright-automation.yaml` | 测试脚本、运行结果、handoff |
| /diff-scan | diff-scan | - | 缺陷发现报告 |
| /infra-diagnose | infra-diagnose | - | 诊断报告 |
