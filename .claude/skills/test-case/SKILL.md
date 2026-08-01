---
name: test-case
description: 编写、更新、导入、同步或标准化 Kata 测试用例。Lanhu/Axure URL、PRD、截图和功能描述等需求源走 create；既有 .yaml、.csv、.xlsx、.md、.xmind 或明确更新诉求走 update。只发 feature 目录且要求 UI 自动化时转 ui-automation；ZenTao hotfix 回归转 defect-analyze。
---

# Outcome

建立或更新可追溯的需求、测试点和 YAML 用例权威，并只通过 `kata cases build` 生成 XMind 等派生格式。

## Routing

- 新需求、PRD、设计稿、截图或功能描述：完整执行 [workflows/create.md](workflows/create.md)。
- 既有 YAML 或 CSV、XLSX、Markdown、XMind，以及标题同步、格式标准化等更新：完整执行 [workflows/update.md](workflows/update.md)。
- 只给 feature 目录并要求生成、修复或验证 UI 自动化：转 `ui-automation`。
- ZenTao Bug ID/URL 的 hotfix 回归报告：转 `defect-analyze`；需要正式 YAML 回归用例时再返回本 Skill。

## Steps

1. 查明事实
   - 读取需求源、用户指定 feature、已有 `prd/prd.md`、`cases/test-points.md`、`cases/需求名.yaml` 以及相关知识和 CLI 状态。
   - 不向用户询问可以从需求源、路径、CLI 或已有文件自行查明的事实。
   - 完成条件：项目和 `<项目>:<版本目录>/<需求目录名>` 唯一，create/update 分支和证据缺口明确。

2. 确认关键决策
   - 只询问需求语义、覆盖取舍、最终发布或不可恢复删除等无法从证据确定且会改变结果的决策。
   - 明确无业务证据的步骤保持待确认，不把历史用例或当前 UI 猜成需求事实。
   - 完成条件：PRD、测试点、YAML 权威链的变更范围和排除项明确。

3. 执行
   - create/update workflow 按确认范围维护 `prd/prd.md`、`cases/test-points.md` 和 `cases/<name>.yaml`；只通过 `kata cases build` 生成 exports。
   - 完成条件：每个测试点可追溯到 PRD，每条用例可追溯到测试点，未伪造自动化映射或占位脚本。

4. 验证
   - 运行 `kata prd lint`、`kata cases build` 和 `kata cases lint --exit-code`，并复读 YAML 摘要链及实际 exports。
   - 完成条件：机械校验成功，派生物无手工改动，并逐项标明已验证、缺业务证据未验证和明确排除项。

## Delivery

- 返回 feature 路径、PRD、测试点、YAML 和实际生成的 exports。
- 逐项说明已验证、缺少业务证据而保持不变、以及被明确排除的覆盖。
- 导入原件归档在 `cases/imports/`；默认只导出 YAML 同名的 XMind。其他格式由 YAML `meta.exports` 以具体文件名明确声明，例如 `需求名.xmind`、`需求名.md`。

## Guardrails

- 需求事实不足时不猜菜单、字段、枚举、步骤或预期；能从知识、证据和源码查明的事实不再询问用户。
- create 流程在最终发布确认前不写 `prd/prd.md`；正式产物不包含「待确认」「用户确认补充」或模型工作提示。
- YAML 是唯一用例源；不手改 `cases/exports/`，也不为缺失自动化伪造 `automation.spec_file`、占位脚本或通过状态。纯接口用例写 `automation.executor: api`，不得同时声明 Playwright `spec_file`。
- 环境与数据使用语义化占位符，不写真实凭据、Cookie 或私密配置。

## References

- create 分支：完整读取 [workflows/create.md](workflows/create.md)。
- update 分支：完整读取 [workflows/update.md](workflows/update.md)。
- 写 YAML 时按需读取 [examples/cases.yaml](examples/cases.yaml)。
- 交付前完整执行 [checklists/review.md](checklists/review.md)。
