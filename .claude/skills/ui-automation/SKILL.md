---
name: ui-automation
description: 触发：只发 feature 目录路径或目录名（不带文件扩展名）且未声明其他意图，或明确要求生成、修复、验证 UI 自动化。把 feature 目录里的用例转成在真实环境跑通的 Playwright 脚本（Web；桌面端 Electron 支持未落地），或修复已有自动化。只写非 UI 用例转 test-case；只做静态代码扫描转 defect-analyze。
---

# ui-automation

把用例转成在真实环境跑通的 Playwright 脚本——Web 走真实浏览器，桌面端（Electron）走真实应用窗口——并实际运行到全部通过。

## 目标形态

| 形态 | 驱动 | 环境差异 |
|---|---|---|
| Web（默认） | 真实浏览器 | base_url / cookie 由 `kata env run` 注入 |
| 桌面端（Electron，未落地） | `playwright._electron` 启动真实应用包 | 无 base_url / cookie；确认项是应用包路径、版本与其后端指向；窗口即 page |

桌面端是 Playwright 的原生能力，与 Web 共用流程、脚本规范与完成标准，但当前没有已验证的桌面端交付，一律标注「未落地」；接到桌面端需求时先向用户说明这一点，再决定是否按本文流程探索。原生 App、小程序暂不在支持范围内，出现这类需求时再增加平台分支，不改动既有 Web 内容。

## 环境确认（先于一切探测）

- 用户没给环境名时：先运行 `kata env list`，再一次性问清用哪个环境，默认推荐 `ltqc-local` 并附上理由。
- 用户回复「确认」「使用默认」即等于选定 `ltqc-local`，直接进入预检，不再重复询问。
- 无法交互提问时：只输出环境确认文案（各环境的 base_url / 租户 / 项目 / cookie 是否已配置），等用户回复；cookie 内容绝不出现在对话中。

## 流程

| Phase | 文件 | 做什么 |
|---|---|---|
| 1 准备 | [workflows/prepare.md](workflows/prepare.md) | 定位 feature、读用例源、环境预检、建骨架 |
| 2 实现 | [workflows/implement.md](workflows/implement.md) | 核对真实 UI、生成脚本、运行与修复 |
| 3 交付 | [workflows/deliver.md](workflows/deliver.md) | 全量运行、lint、handoff、验收说明 |

## 完成标准

以下三条同时满足才算完成：

1. `automation/tests/runners/full.spec.ts` 在目标环境全量通过；
2. 本次 `runs/<run-id>/` 下有 Allure 结果；
3. 被测平台已产生该用例核心流程的业务记录数据（规则、任务等确已真实创建）。

只读脚本（纯导航 + 可见性断言）只有在用户明确要求只读覆盖时才算覆盖；否则应把该用例排除，并在 handoff 中写清原因，不得声称完成。只跑通 smoke 不算完成。

## 纪律

- 业务动作（创建 / 编辑 / 保存 / 删除 / 运行 / 导入）必须走页面操作；未经用户针对具体动作的明确授权，不得用后端接口替代 UI。
- 不得靠弱化断言、`try-catch` 吞错、`test.skip` 或 mock 被测业务接口来换取通过。
- 菜单、字段、按钮等以真实探测为准（浏览器或应用窗口），不要把需求文档的描述当作 UI 依据；`kata knowledge read` 的命中条目可作候选，与探测结果冲突时以探测为准。
- Cookie 只经 `kata env run <env> -- <command>` 注入；真实值只保存在 `config/env/<env>.yaml`（权限 0600），不进对话、日志、代码、测试夹具。

## 知识闭环

- 定位 feature 后先运行 `kata knowledge read --project <project> --module <模块>` 注入命中条目；修复过程中遇到报错时，按 `--keyword <报错关键词>` 补查。
- 交付前把探测核实过的页面信息和踩坑记录按四种状态写回（`kata knowledge write`，见 domain-knowledge skill）；仅单次观察到的现象要先向用户确认再写入，没有新知识就不写入。

## 产物位置

```
<featureDir>/automation/scripts/
<featureDir>/automation/tests/{cases,runners,pages,helpers,fixtures,sql}/
<featureDir>/runs/<run-id>/{allure-results,screenshots,logs,handoff.md}
```

骨架用 `kata automation scaffold <featureDir>` 创建，目录违规用 `kata automation normalize` 修复。Playwright 必须经 `kata runs exec <feature-id> --project <project> -- <command...>` 运行，由 CLI 以原子方式分配 `runs/<run-id>/` 并注入 `KATA_RUN_PATH`、`KATA_ALLURE_RESULTS_DIR`；缺少显式 run 路径时直接失败。只需要分配目录、分阶段执行时可用 `kata runs new`，但后续命令仍必须显式传入该 run 路径。仓库内禁止 `.runs/`。跨 feature 复用的页面对象与 helper 放在 `workspace/<project>/_shared/`。

用例的自动化映射分 `unmapped`、`mapped-not-implemented`、`implemented` 三种状态；只有 `implemented` 状态的用例才能进入 full runner，且其 `automation.spec_file` 必须指向可加载的 `t<序号>-<slug>.ts`。准备阶段和交付阶段都必须运行 feature 与 shared automation lint。
