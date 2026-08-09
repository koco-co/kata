---
name: automation
description: 编排、实现、修复、运行或验证 Kata 自动化。用户提供 feature、要求 Web UI、App UI 或 API 自动化，或指定 playwright-web-ui、appium-app-ui、request-api、midscene-web-ui、midscene-app-ui 等 executor 时使用；动态选择已登记 executor，并以同一次执行的证据链裁决结果。只编写非自动化用例转 test-case，静态缺陷扫描转 defect-analyze。
---
# Outcome

把 canonical YAML 用例交给唯一匹配的 executor 实现和真实执行，并用同一 manifest、execution、attempt 的证据证明结果。

## Routing

| 用户意图                   | 执行路径                                     |
| -------------------------- | -------------------------------------------- |
| 新建、补齐或修复自动化实现 | prepare → implement → deliver              |
| 运行或验证已有 active 实现 | prepare → deliver；实现失败时返回 implement |
| 只编写或修改业务用例       | 转`test-case`                              |
| 只生成静态缺陷扫描报告     | 转`defect-analyze`                         |

只从 `automation/*/executor.toml` 发现 executor。根据 surface、canonical implementation、项目默认值和用户显式选择确定唯一 executor；多匹配且无默认值时停止并请用户决策。选定后完整读取 descriptor 及其 `agent.guide`，引擎细节以 guide 为准。

## Steps

1. 查明事实

   - 完整读取 [workflows/prepare.md](workflows/prepare.md) 和 [references/executor-contract.md](references/executor-contract.md)。
   - 确定 project、feature、case 范围、active/planned 状态、surface、环境、写入副作用和业务记录策略。
   - 完成条件：范围与 canonical identity 唯一，executor descriptor 和 guide 已读取，环境与权限缺口有证据。
2. 确认关键决策

   - 只询问无法从 YAML、descriptor、guide、CLI 或当前证据确定且会改变结果的事项：executor 歧义、目标环境、真实写入权限和缺失业务证据。
   - 不把未登记 executor、planned 实现、仅导航覆盖或无业务读回的路径降级为已完成。
   - 完成条件：executor、实现范围、副作用权限和验收证据标准均已唯一确定。
3. 执行

   - 新建、补齐或修复实现时，完整执行 [workflows/implement.md](workflows/implement.md)，并遵循 [references/conventions.md](references/conventions.md)。
   - 运行或交付时，完整执行 [workflows/deliver.md](workflows/deliver.md)，不得绕过稳定 CLI lifecycle。
   - 只有范围互不重叠时才按 [prompts/worker.md](prompts/worker.md) 委派；主会话保留 executor 选择、共享契约和最终运行责任。
   - 完成条件：目标 case 均有真实实现或明确未完成分类，canonical 状态没有超前声明。
4. 验证

   - 按 [references/evidence-contract.md](references/evidence-contract.md) 核对完整证据链，并用 [checklists/review.md](checklists/review.md) 自审。
   - 读取 CLI 生成的 `handoff.md`；[templates/handoff.md](templates/handoff.md) 只定义格式，[examples/handoff.md](examples/handoff.md) 只展示脱敏样例，均不得替代真实运行产物。
   - 完成条件：verify 通过且所有必需证据来自同一 execution 与 attempt；任何缺项都明确标为 NOT VERIFIED。

## Delivery

- 返回 executor ID、logical run、execution、attempt、case 统计、验证结论和 handoff 路径。
- 分开报告产品缺陷、实现错误、数据问题、权限问题、环境问题和未验证项。
- 只提供稳定 CLI 重跑入口，不暴露底层 runner、凭据或私密配置。

## Guardrails

- CLI 是 canonical YAML、项目配置和私密环境的唯一读取者；executor 只接收受控输入和 immutable manifest。
- 不用 skip、mock 被测业务、弱断言、自动重试或删除失败证据换取绿色状态。
- 不在 feature 下恢复自动化源码，不创建 generated runner，不为旧路径提供别名或双写。
- 不手工编造 Allure、evidence、business record、status 或 handoff。

## References

- 准备：[workflows/prepare.md](workflows/prepare.md)
- 实现：[workflows/implement.md](workflows/implement.md)
- 运行与交付：[workflows/deliver.md](workflows/deliver.md)
- Executor 合同：[references/executor-contract.md](references/executor-contract.md)
- 通用实现规范：[references/conventions.md](references/conventions.md)
- 证据合同：[references/evidence-contract.md](references/evidence-contract.md)
- 并行 worker：[prompts/worker.md](prompts/worker.md)
- 交付自审：[checklists/review.md](checklists/review.md)
- Handoff 格式：[templates/handoff.md](templates/handoff.md)；
- 脱敏示例：[examples/handoff.md](examples/handoff.md)
