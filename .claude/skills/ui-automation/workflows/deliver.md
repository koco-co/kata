# Phase 3：交付

1. **全量运行**：用 `kata runs exec <版本目录/需求目录名> --project <project> --type run -- kata env run <env> -- <playwright command>` 以原子方式创建交付 run，并全量运行 `automation/tests/runners/full.spec.ts`；结果只能落在该 run 目录，仓库内禁止 `.runs/`。
2. **结果校验**：`kata runs verify --project <project> --feature <featureDir> --run <run-id>` 校验本次 run 的产物完整性（Allure 结果、截图、日志齐全）。
3. **结构检查**：`kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code`；`kata automation normalize <featureDir> --exit-code`（dry-run 有违规即 exit 1）；`kata automation lint <featureDir> --exit-code`；共享页面、helper 和 fixture 另运行 `kata automation lint --shared --exit-code`，所有违规必须清零。
4. **覆盖检查**：运行 `kata automation coverage <featureDir>` 逐条核对 cases YAML 的 `automation.spec_file`、`tests/cases/` 文件和 runner import；`unmapped`、`mapped-not-implemented` 之外的项（`missingScript`、`orphanScripts`、`duplicateSpecFile`）必须清零，存在缺失或被排除的用例时直接判失败，不把只读导航或空壳脚本算作覆盖。
5. **写 `runs/<run-id>/handoff.md`**，结构按 [../templates/handoff.md](../templates/handoff.md)，填写示例见 [../examples/handoff.md](../examples/handoff.md)：
   - 每条用例：状态（通过 / 排除）、证据（Allure、截图、平台业务记录的名称或 ID）；
   - 排除的用例写清原因类别与阻塞点；
   - 实现阶段发现的书面用例与真实 UI 差异单独列成一节，供 test-case 侧修正用例源。
6. **回复用户**：给出验收命令（如何重跑 full）、通过与排除清单、已验证与未验证范围，逐条对照 SKILL.md 完成标准说明达成情况。任一条未达成就不能算完成，只能如实说明当前进度。
