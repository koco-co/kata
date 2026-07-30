---
name: ui-automation
description: 生成、修复、运行或验证 feature 目录中的 Playwright UI 自动化；用户只发送 feature 目录路径且未声明其他意图时也触发。当前正式支持 Web，Electron 仅可在说明未落地并取得用户决定后探索；非 UI 用例转 test-case，静态代码扫描转 defect-analyze。
---

# Outcome

将 YAML 用例实现为目标 Web 环境中真实执行的 Playwright 脚本，并用运行结果、Allure 和平台业务记录证明完成状态。

## Routing

- Web 已落地：依次执行 prepare、implement、deliver。
- Electron 未落地：先说明没有已验证交付链，取得用户是否探索的决定；未经决定不套用 Web 完成声明。
- 原生 App、小程序和非 Playwright 平台：超出当前能力，说明边界。
- 只写非 UI 用例：转 `test-case`；只做静态扫描：转 `defect-analyze`。

## Steps

1. 确认 feature 与环境
   - 没有环境名时先运行 `kata env list`，推荐 `ltqc-local` 并说明依据；用户确认默认后不重复询问。
   - 完成条件：feature 路径、目标环境和待自动化 YAML 用例清单唯一，Cookie 只确认配置状态而不读取或回显值。

2. 顺序执行工作流
   - 完整执行 [workflows/prepare.md](workflows/prepare.md)、[workflows/implement.md](workflows/implement.md) 和 [workflows/deliver.md](workflows/deliver.md)。
   - 完成条件：前一阶段的完成条件全部满足后才进入下一阶段；失败项有明确分类和证据。

3. 判断交付状态
   - 只有 `automation/tests/runners/full.spec.ts` 全量通过、本次 run 有 Allure 结果、且平台产生核心流程业务记录时才算完成。
   - 完成条件：三项证据均来自同一目标环境和同一 `runs/<run-id>/`；任一缺失即交付未完成状态。

## Delivery

- 返回重跑 full 的命令、通过与排除清单、Allure 与截图位置、平台业务记录名称或 ID。
- 分开报告脚本问题、产品 Bug、数据问题、权限问题和环境问题。
- 只读导航只有用户明确要求只读覆盖时才算覆盖；只跑 smoke、仅语法检查或仅有 runner exit 0 均不算完成。

## Guardrails

- 创建、编辑、保存、删除、运行和导入等业务动作通过真实页面完成；后端接口只用于经授权的前置数据或诊断，不替代被测 UI 行为。
- 不用弱断言、吞错、`test.skip` 或 mock 被测业务接口换取通过。
- 菜单、字段和按钮以真实探测为准；书面用例错误时记录差异并交回 `test-case` 修正 YAML。
- Cookie 只经 `kata env run` 注入，真实值保存在权限为 `0600` 的 `config/env/<env>.yaml`，不进入对话、日志、代码或 fixture。
- Playwright 只能经 `kata runs exec` 或已分配的 `kata runs new` 路径运行；CLI 注入 `KATA_RUN_PATH`。结果进入 feature 的 `runs/<run-id>/`，仓库根目录不创建 `.runs`。
- 正式脚本使用 `c<四位序号>-<英文slug>.spec.ts`；slug 根据中文标题判断并只保留一个，既有 slug 不因标题修改自动重算。

## References

- 准备阶段：完整读取 [workflows/prepare.md](workflows/prepare.md)。
- 实现阶段：完整读取 [workflows/implement.md](workflows/implement.md) 和 [references/conventions.md](references/conventions.md)。
- 交付阶段：完整读取 [workflows/deliver.md](workflows/deliver.md)。
- 需要具体 API 时按需读取 [references/playwright-api.md](references/playwright-api.md)。
- 用户明确要求并行子代理时，读取 [prompts/worker.md](prompts/worker.md)。
