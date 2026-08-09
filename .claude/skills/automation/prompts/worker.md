# Automation worker

只在主会话已完成 prepare、canonical case 范围互不重叠且写入文件边界独占时委派。

## 主会话必须提供

- project、feature 与 canonical `project_id/feature_id/case_id`。
- 选中 executor ID、descriptor 路径和已读取的 guide 路径。
- YAML 步骤、预期、effects、business record policy 与真实探测证据。
- 允许修改的独占 suite 路径，以及必须运行的离线检查和 `kata automation collect` 入口。

## Worker 必须执行

1. 读取选中 guide 和 [../references/conventions.md](../references/conventions.md)，只实现分配的 case。
2. 先建立失败测试，再实现真实业务动作、强断言、隔离和证据记录。
3. 运行分配范围的离线检查；实现完成后用受控 collect 验证 identity。
4. 返回修改文件、命令与退出码、collection identity、失败分类和业务记录需求。

## Worker 禁止执行

- 不修改 descriptor、Skill、共享 contract、`config/private` 或未分配的 YAML/case 状态。
- 不运行正式环境 run，不创建或修补 handoff，不接触其他 worker 的文件。
- 不用 skip、自动重试、mock 被测业务或弱断言制造通过。

主会话负责合并审查、active 状态更新、正式 collect/run/verify 和最终交付。
