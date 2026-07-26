# 阶段 3：交付

1. **全量运行**：用 `kata runs exec <feature-id> --project <project> --type run -- kata env run <env> -- <playwright command>` 原子创建交付 run 并跑 `automation/tests/runners/full.spec.ts` 全量；结果只能落在该 run 目录，仓库内禁止 `.runs/`。
2. **结构检查**：`kata cases lint --project <项目> --feature <目录名或 metadata.id> --exit-code`；`kata automation normalize <featureDir>`（dry-run 应无违规）；`kata automation lint <featureDir> --exit-code`；共享页面、helper 和 fixture 另跑 `kata automation lint --shared --exit-code`，所有违规必须清零。
3. **覆盖检查**：逐条核对 cases YAML 的 `automation.spec_file`、`tests/cases/` 文件和 runner import；缺失或排除用例直接失败，不把只读导航或空壳脚本算作覆盖。
4. **写 `runs/<run-id>/handoff.md`**，结构照 [../templates/handoff.md](../templates/handoff.md)：
   - 每条用例：状态（通过 / 排除）、证据（Allure、截图、平台业务记录的名称或 ID）；
   - 排除的用例写清原因类别与阻塞点；
   - 实现阶段发现的书面用例与真实 UI 的差异单独列一节，供 test-case 侧修正用例源。
5. **回复用户**：验收命令（如何重跑 full）、通过与排除清单、已验证与未验证范围，逐条对照 SKILL.md 完成标准说明达成情况。任一条未达成就不是完成，只能说当前进度。
