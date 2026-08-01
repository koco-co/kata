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

1. 选择工作流并定位 feature
   - 新 feature 由 CLI 解析身份；既有 feature 从用户给定的规范路径定位。
   - 完成条件：项目和 `<项目>:<版本目录>/<需求目录名>` 唯一，create/update 分支明确。

2. 维护权威链
   - `prd/prd.md` 是确认后的需求权威，`cases/test-points.md` 是覆盖设计，`cases/需求名.yaml` 是用例权威。
   - 完成条件：每个测试点可追溯到 PRD，每条用例可追溯到测试点；摘要链与当前内容一致。

3. 构建并验证派生物
   - 只从 YAML 的 `meta.exports` 中声明的具体文件名生成 `cases/exports/需求名.xmind`、Markdown、CSV 或 XLSX；省略 `exports` 时默认生成与 YAML 同名的 XMind。
   - 完成条件：`kata prd lint`、`kata cases build` 和 `kata cases lint --exit-code` 均成功；派生物没有手工改动。

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
