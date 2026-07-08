# quality-gate

质量闸门 = 一条命令，不在本文复述检查项清单：

```bash
kata cases lint --exit-code --severity fail-only --scope workspace
```

- flag 拼写以 `bun run kata cases lint --help` 为准（`--severity` 取 `all|fail-only`、`--exit-code`、`--scope`）。
- 退出码非 0（有 fail 级违规）→ 本次运行标记 `quality_gate_failed`，阻塞 handoff。
- warn 级发现只上报，不阻塞。
- Playwright 自动化的人工质量闸还必须核对 handoff 中是否有 Allure 路径和平台记录数据。若目标用例包含状态变化但 handoff 没有记录名称/ID/状态证据，质量闸视为 failed，即使 `kata cases lint` 退出码为 0。

具体检查项（如 `case_traceability_header`、`no_feature_local_helpers`、`no_debug_in_cases`、`handoff_double_track`）在 §6/§9/§11 各自约束处单独引用，其实现由 `.claude/scripts/_shared/lint/**` 定义，本闸门只负责跑 lint 聚合并按退出码判读。

- `automation/` 顶层无散落 `.md` `.json` `.yaml` 文件（`references/directory-structure.md#automation-顶层`）。
