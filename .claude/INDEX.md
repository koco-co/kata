# Claude Code Runtime 命令索引

每行映射：command → skill → workflow 规范来源 → 主要产物。workflow 详情见 `.claude/contracts/workflows/`，skill 路由样例见 `.claude/contracts/routes/`。

| Command | Skill | Workflow 规范来源 | 主要产物 |
| --- | --- | --- | --- |
| /workspace-manage | workspace-manage | - | 功能菜单、工作区状态 |
| /case-draft | case-draft | `.claude/contracts/workflows/case-draft.yaml` | archive.md、cases.xmind、metadata.yaml、manifest.json |
| /case-edit | case-edit | `.claude/contracts/workflows/case-edit.yaml` | archive、xmind |
| /knowledge-curate | knowledge-curate | - | 知识条目、查询结果 |
| /bug-file | bug-file | - | 缺陷报告 |
| /conflict-analyze | conflict-analyze | - | 冲突分析结论、解决方案 |
| /case-hotfix | case-hotfix | `.claude/contracts/workflows/case-hotfix.yaml` | archive、notes |
| /playwright-automation | playwright-automation | `.claude/contracts/workflows/playwright-automation.yaml` | 测试脚本、运行结果、handoff |
| /diff-scan | diff-scan | - | 缺陷发现报告 |
| /infra-diagnose | infra-diagnose | - | 诊断报告 |
