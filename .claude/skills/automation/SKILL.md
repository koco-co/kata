---
name: automation
description: 编排、实现、运行或验证 Kata 自动化。用户提供 feature 目录、要求 Web UI、App UI 或 API 自动化，或指定 playwright-web-ui、appium-app-ui、request-api、midscene-web-ui、midscene-app-ui 等 executor 时使用；动态选择 executor 并以同一次执行的证据裁决交付。只编写非自动化用例转 test-case，静态缺陷扫描转 defect-analyze。
---

# Outcome

将权威 YAML 用例交给合适的 executor 真实执行，并以可追溯的 manifest、报告、证据和业务记录证明结果。

## Routing

- 扫描 `automation/*/executor.toml`；只把实际存在且通过校验的 descriptor 当作可用 executor，不硬编码 executor 列表。
- 按用例 surface、项目默认值与用户显式选择决定 executor；唯一匹配直接选择，多匹配且无默认值时硬失败并请用户决策。
- 选定 executor 后，先完整读取 descriptor 及其 `agent.guide` 指向的文件；引擎、surface 与项目实现细节以该 guide 为准。
- `playwright-web-ui`、`appium-app-ui`、`request-api`、`midscene-web-ui` 和 `midscene-app-ui` 只是稳定 ID 示例；未落地 descriptor 时不得声称可执行。
- 只编写或修改业务用例转 `test-case`；明确要求静态缺陷报告转 `defect-analyze`。

## Steps

1. 查明事实
   - 确定 project、feature、surface、目标环境和待处理用例范围；用 CLI 生成的选择与 manifest 作为运行边界。
   - 校验所有 descriptor 的 ID、surface、lifecycle 命令和 guide 路径，并完整读取选中 executor 的 guide。
   - 不读取 `config/private`；只确认环境和凭据配置状态，不展开、回显或复制 secret。
   - 完成条件：executor 唯一、guide 已读取，用例范围和环境状态有明确证据。

2. 确认关键决策
   - 只询问无法从 descriptor、项目默认值或现有证据确定且会改变结果的决策，包括 executor 歧义、目标环境、真实业务写入和缺失的业务证据。
   - 不将未实现 executor、仅导航覆盖或无业务读回的路径降级成已完成。
   - 完成条件：executor、范围、业务副作用权限与证据标准已唯一确定。

3. 执行
   - 必要时显式运行 `kata automation setup`；再用 `kata automation doctor` 只读检查执行环境。不在 run 中隐式安装、升级或下载。
   - 先运行 `kata automation collect` 获得不启动被测系统的精确用例集，确认无缺失、重复或额外 item 后，才运行 `kata automation run`。
   - 只经稳定 CLI lifecycle 调用 executor，不要求用户组装底层包管理器或测试 runner 命令。
   - `run` 在分配 attempt 前必须落盘 collection 与 preparation 状态；若收集、环境解析或写入安全闸失败，保留 `NOT VERIFIED` handoff，不伪造 attempt。
   - 每次重跑分配新 attempt，保留之前失败与证据；禁止自动重试、顺序依赖、skip、mock 被测业务或弱断言。
   - 完成条件：collection 与 manifest 一致，executor 只写当前 execution/attempt，且真实业务动作已执行。

4. 验证
   - 运行 `kata runs verify`，核对同一 execution 与 attempt 的 `execution-manifest.json`、collection/preparation/run 状态、Allure、`evidence/` 和 `business-records/`。
   - 业务记录要么按 manifest 标记 required 并有界面读回证据，要么标记 not_applicable 并有权威原因；不得人工补造。
   - 根据验证结果更新 logical run 根目录的 `handoff.md`，严格区分通过、产品缺陷、实现错误、数据/权限/环境阻塞和未验证。
   - 完成条件：verify 通过且所有必需证据可追溯到同一 manifest 和 attempt；任一缺失都明确交付未完成。

## Delivery

- 返回选中 executor ID、logical run/execution/attempt ID、用例统计、verify 结论与 `artifacts/runs/<project-id>/<logical-run-id>/handoff.md` 路径；attempt 前失败须明确标为 unavailable。
- 提供稳定 CLI 重跑入口，不暴露 executor 底层命令。
- 只有 command、collection、Allure、evidence、必需业务记录和 verify 全部成立才声称通过；单独 exit 0 不是交付证据。

## Guardrails

- CLI 是权威 YAML、项目配置与私密环境的唯一读取者；executor 只接收无 secret、版本化且不可变的 manifest。
- secret 只能经受控子进程环境短暂注入，不进入参数、对话、日志、报告、截图、trace 或仓库。
- 一个 execution 只属于一个 executor；多 executor 对比由 logical run 聚合，不共享可变状态。
- 禁止 generated runner、旧路径双写、用临时别名绕过 descriptor，或以删除失败证据换取绿色状态。

## References

- Executor 发现与 lifecycle 合同：完整读取选中的 `automation/*/executor.toml`。
- Executor 实现规约：完整读取 descriptor 的 `agent.guide` 目标；不把引擎细节复制到本 Skill。
