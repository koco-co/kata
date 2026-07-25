---
name: ui-automation
description: 把 feature 目录里的用例转成在真实环境跑通的 Playwright UI 自动化（Web 或 Electron 桌面端），或修复已有自动化。触发方式——只发需求功能目录路径或目录名（features/【v...】...，不带文件扩展名），或要求生成、修复、验证 UI 自动化。只写非 UI 用例转 case；只做静态代码扫描转 defect-analyze。
---

# ui-automation

目标：让用例在真实环境跑通——Web 走真实浏览器，桌面端（Electron）走真实应用窗口——并拿出运行证据。

## 环境确认（先于一切探测）

- 用户没给环境名：先 `kata env list`，再一次性问清用哪个环境，默认推荐 `ltqc-local` 并附理由。
- 用户回复「确认」「使用默认」即等于选定 `ltqc-local`，直接进预检。
- cookie 内容永不出现在对话里；运行一律 `kata env run <env> -- npx playwright test ...`，不裸跑。
- 桌面端（Electron）目标：用 `playwright._electron` 启动真实应用包；无 base_url / cookie，确认项是应用包路径、版本与后端指向；窗口即 page，流程、规范与完成标准与 Web 一致。

## 流程

1. **准备**：定位 feature 目录（用 metadata.yaml / cases yaml 标题精确匹配）；读 `cases/需求名.yaml` 列出用例清单；`kata env doctor <env>` 预检；`kata automation scaffold <featureDir>` 补骨架；缺用例源又缺 prd 时阻塞，让用户先走 case。定位后先 `kata knowledge read --project <项目> --module <模块>` 注入命中条目。
2. **实现**：逐条用例——先按 `workspace/<project>/knowledge/` 与真实浏览器探测核对菜单、字段、按钮（冲突以真实探测为准）；再写脚本（`automation/tests/cases/`，选择器 getByRole 优先，断言落在真实业务结果）；跑失败先分类（产品/脚本/数据/权限/环境）再修，遇报错按 `kata knowledge read --keyword <报错关键词>` 补查，每个 spec 最多 3 轮，修不通就排除并写明原因。
3. **交付**：`kata runs new <feature-id>` 建 run，跑 `automation/tests/runners/full.spec.ts` 全量；把探测核实的页面事实与踩坑按四态写回（`kata knowledge write`，单次观察先确认再写入，没有新知识零写入）；写 `runs/<run-id>/handoff.md`（每条用例状态与证据、排除原因、书面用例与真实 UI 的差异）。

## 真实性底线

- 业务动作（创建/编辑/保存/删除/运行/导入）必须走页面操作；未经用户明确授权不用后端接口替代 UI。
- 不弱化断言、不 try-catch 吞错、不 test.skip、不 mock 被测业务接口来换通过。
- Cookie 真实值只存 `config/env/<env>.yaml`（0600），不进对话、日志、代码。

## 完成标准（同时满足）

1. `full.spec.ts` 在目标环境全量通过；
2. 本次 `runs/<run-id>/` 下有 Allure 结果；
3. 被测平台产生了该用例核心流程的业务记录数据。

只读脚本只在用户明确要求只读覆盖时算数；只跑通 smoke 不算完成。任一条未达成就不是完成，只能报当前进度。
