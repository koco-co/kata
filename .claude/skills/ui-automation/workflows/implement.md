# Phase 2：实现

逐条用例推进：核对真实 UI → 写脚本 → 运行 → 失败修复。

## 核对（plan + probe）

1. 运行 `kata knowledge read --project <项目> --module <模块>` 注入命中条目（含界面文案与规则语义），作为菜单、字段与规则语义的候选；存疑时用 `kata repos grep/show` 查源码中的枚举。
2. 用真实浏览器（桌面端为应用窗口）逐页探测菜单路径、表单字段、按钮与枚举值；截图和 DOM 证据存入 run 目录。书面用例与真实 UI 冲突时，以真实 UI 为准调整脚本；如果是用例本身写错，记录差异，交付时反馈。
3. 为每条用例明确业务动作序列、可见断言与前置数据（fixture / SQL）。

## 生成（generate）

4. 根据每条用例的 `automation.spec_file` 生成或维护 `automation/tests/cases/c<四位序号>-<slug>.spec.ts`，runner 只负责 import；脚本规范见 [../references/conventions.md](../references/conventions.md)。
5. 运行一律走 `kata runs exec <版本目录/需求目录名> --project <project> -- kata env run <env> -- bunx playwright test ...`，不裸跑——run 路径与环境变量由 kata 注入。
6. 用例的每个步骤都必须实现为真实页面动作，断言落在真实业务结果上；「导航 + 可见性」不算业务覆盖。
7. 会改变平台状态的用例，必须创建唯一的测试记录，并用 UI 证据（路由、DOM 文案、截图、Allure 附件）断言记录名称、ID 与状态。在共享环境重建记录前，先清理或隔离历史自动化数据。

## 运行与修复（self-run + repair）

8. 逐条运行 spec：单条用例用 full.spec 全路径加 `-g` 按标题过滤，把命令、退出码与输出记入 run 目录：

   ```bash
   kata runs exec <版本目录/需求目录名> --project <project> --type selfrun -- \
     kata env run <env> -- bunx playwright test automation/tests/runners/full.spec.ts -g "<用例标题>"
   ```
9. 失败后先分类，再决定修什么：

   | 类别 | 特征 | 处理 |
   |---|---|---|
   | 产品 bug | UI 行为与需求预期矛盾 | 停止该用例，记入 handoff；不弱化断言迁就它 |
   | 脚本问题 | 选择器失效、时序、等待不足 | 修脚本 |
   | 数据问题 | 前置数据缺失、脏数据 | 修 fixture / SQL，或先清理历史数据 |
   | 权限问题 | 账号无权操作 | 报给用户，用例排除 |
   | 环境问题 | 服务不可达、cookie 失效 | 按 infra-diagnose 排查，或换环境 |

10. 每个 spec 最多 3 轮修复；修不通就排除该用例并写明原因，不无限重试。
11. 每轮修复后重跑 `kata automation lint <featureDir> --exit-code`；共享页面、helper、fixture 有变更时，同步运行 `kata automation lint --shared --exit-code`。

## 子代理

用例较多时，可按 [../prompts/worker.md](../prompts/worker.md) 派子代理逐条实现；主会话负责探测结论、规范统一与最终的汇总运行。
