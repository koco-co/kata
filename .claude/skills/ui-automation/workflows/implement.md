# 阶段 2：实现

逐条用例推进：核对真实 UI → 写脚本 → 跑 → 失败修复。

## 核对（plan + probe）

1. `kata knowledge read --project <项目> --module <模块>` 注入命中条目（含界面文案与规则语义），形成菜单 / 字段 / 规则语义的候选事实；存疑用 `kata repos grep/show` 查源码枚举。
2. 真实浏览器（桌面端为应用窗口）逐页探测：菜单路径、表单字段、按钮、枚举值；截图与 DOM 证据存 run 目录。书面用例与真实 UI 冲突时以真实 UI 为准调脚本；用例本身写错的记录差异，交付时反馈。
3. 每条用例明确：业务动作序列、可见断言、前置数据（fixture / SQL）。

## 生成（generate）

4. 脚本规范见 [../references/conventions.md](../references/conventions.md)；Playwright API 速查见 [../references/playwright-api.md](../references/playwright-api.md)。
5. 运行一律 `kata env run <env> -- npx playwright test ...`，不裸跑——环境变量由 kata 注入。
6. 每条用例步骤必须实现为真实页面动作，断言落在真实业务结果上；「导航 + 可见性」不算业务覆盖。
7. 会改变平台状态的用例，必须造唯一测试记录，并用 UI 证据（路由、DOM 文案、截图、Allure 附件）断言记录名称 / ID / 状态。在共享环境重建记录前，先清理或隔离历史自动化数据。

## 运行与修复（self-run + repair）

8. 逐条跑 spec，命令 / 退出码 / 输出记入 run 目录。
9. 失败先分类，再决定修什么：

   | 类别 | 特征 | 处理 |
   |---|---|---|
   | 产品 bug | UI 行为与需求预期矛盾 | 停止该用例，记入 handoff；不弱化断言迁就 |
   | 脚本问题 | 选择器失效、时序、等待不足 | 修脚本 |
   | 数据问题 | 前置数据缺失、脏数据 | 修 fixture / SQL，或先清理历史数据 |
   | 权限问题 | 账号无权操作 | 报给用户，用例排除 |
   | 环境问题 | 服务不可达、cookie 失效 | 按 infra-diagnose 排查，或换环境 |

10. 每个 spec 最多 3 轮修复；修不通就排除该用例并写明原因，不无限重试。

## 子代理

用例多时可按 [../prompts/worker.md](../prompts/worker.md) 派子代理逐条实现；主会话负责探测结论、规范统一与最终汇总运行。
