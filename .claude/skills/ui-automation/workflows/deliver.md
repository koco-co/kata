# Phase 3：交付

## Steps

1. 执行 full run
   - 使用 `kata runs exec <版本目录/需求目录名> --project <project> --type run -- kata env run <env> -- <playwright command>` 全量运行 `automation/tests/runners/full.spec.ts`。
   - 完成条件：命令在一个原子分配的 run 中结束，结果只进入 feature 的 `runs/<run-id>/`。

2. 校验运行证据与覆盖
   - 运行 `kata runs verify --project <project> --feature <feature-path> --run <run-id>`。
   - 运行 `kata automation coverage <feature-dir>`，逐条核对 YAML 映射、case 脚本和 runner import。
   - 完成条件：run 状态、Allure 和必要证据满足 verify；`missingScript`、`orphanScripts`、`duplicateSpecFile` 为零，任何未实现项使整体保持未完成。

3. 执行结构闸门
   - 运行 `kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code`。
   - 运行 `kata automation normalize <feature-dir> --exit-code`、`kata automation lint <feature-dir> --exit-code` 和 `kata automation lint --shared --project <project> --exit-code`。
   - 完成条件：所有命令退出码为 0；normalize 没有待应用迁移，feature 和 shared 均零违规。

4. 写 handoff 并回复
   - 按 [../templates/handoff.md](../templates/handoff.md) 写 `runs/<run-id>/handoff.md`，详细程度参考 [../examples/handoff.md](../examples/handoff.md)。
   - 逐条记录通过或未完成状态、Allure/截图、平台业务记录名称或 ID、阻塞类别，以及书面用例与真实 UI 差异。
   - 完成条件：handoff 与同一 run 的证据一致；回复包含重跑命令、已验证和未验证范围，且只有三项核心完成证据齐全时才声明完成。
