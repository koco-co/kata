# ui-plan

## 读取时机

进入 `ui-plan` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 输出

- 写入对应 schema。
- 保留 SourceRef。
- 区分 case_claim、observed_ui、environment、run_artifact 与 product_knowledge。

## Source-backed bootstrap

当 case-normalize 输出 `source_backed_bootstrap` 时：

1. 先完成 env-preflight，并确认要用的 env profile；用户只给短提示、且 `ltqc-local.yaml` 存在时，askuser 默认推荐它。
2. 确认环境后，才能读取当前目标 feature 目录下的 `prd.md` 与 `inputs/lanhu-snapshots/**`；其他 feature 的 PRD、截图、archive、tests 都不能读。
3. `prd.md` 与截图只能产出 `case_claim` / `design_source`：用来推断页面入口、按钮文案、表单意图和最小 P0 自动化范围；不能把它们写成 observed UI 事实。
4. ui-plan 必须声明 `mode: source_backed_bootstrap`，并按用例步骤与预期规划真实覆盖：范围内每条用例的动作步骤都要落成真实页面动作，预期结果都要落成真实业务断言。哪怕走 bootstrap，也不能把计划缩成只验「页面可达 + 元素可见」的表层 runner。真实 UI probe 撑不起 PRD 里的深链路时，在 plan-reconcile 判 `blocked` 或 `needs_user_decision`，或者诚实排除（记入 `handoff.excluded_cases` + `reason_category` + 原因）；不能降级成弱断言，也不能用弱断言凑通过。
5. 不能生成最终的 `archive.md` 或 `test-point-checklist.md`；Playwright 脚本的 SourceRef 必须指向 `prd.md` 或 `source_backed_bootstrap` intent，并在 handoff 里注明 case-draft 仍未完成。

## UI 知识记录

规划选择器、页面结构、站点域行为，以及踩到的坑，都要记进 knowledge 库。

| 类型 | 识别信号 | 示例 |
|---|---|---|
| `selector` | 站点特有的定位器模式 | "该站点所有表格都用 .ant-table 但分页器用 .custom-pager" |
| `page_object` | 页面结构 / 路由 / Fragment | "#/projects 页面有两个 Tab，切换后 URL hash 不变" |
| `site_domain` | 站点域名特有行为 | "该站点登录后 token 存于 sessionStorage 而非 cookie" |
| `pitfall` | UI 自动化踩坑 | "该站点 input 框 change 事件须 dispatch native event" |

用 `kata knowledge-curate` CLI 写入 `sites/{domain}/` 路径。站点 selector 文件这样命名：`sites/{domain}/selectors.md` 或 `sites/{domain}/dom-{product}.md`。

硬约束：
- 发现新的站点选择器模式时，先查知识库；已有匹配就不重复写入。
- 调试 playwright 脚本时，选择器失败如果是 DOM 结构差异引起的，记成 `module` 类型写入 `sites/{domain}/`。
- 站点级知识不能写进项目级 overview 或 terms。

## dataAssets 前置条件计划

- 把 Archive MD 的通用前置条件规划成 worker-scoped auto fixture。
- 把各用例不同的前置条件规划成 case 内步骤或 beforeEach。
- 不用 `test.beforeAll(async ({ page }) => ...)`；需要浏览器上下文时，用 `browser.newPage({ storageState })` 创建页面。
