# ui-plan

## 读取时机

进入 `ui-plan` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 输出

- 写入对应 schema。
- 保留 SourceRef。
- 区分 case_claim、observed_ui、environment、run_artifact 与 product_knowledge。

## Source-backed bootstrap

当 case-normalize 输出 `source_backed_bootstrap` 时：

1. 必须先完成 env-preflight，并确认使用的 env profile；用户只给短提示时，`ltqc-local.yaml` 存在则 askuser 默认推荐它。
2. 环境确认后，才允许读取当前目标 feature 目录下的 `prd.md` 与 `inputs/lanhu-snapshots/**`；不得读取其他 feature 的 PRD、截图、archive 或 tests。
3. `prd.md` 与截图只能产出 `case_claim` / `design_source`：用于推断页面入口、按钮文案、表单意图和最小 P0 自动化范围；不得把它们写成 observed UI 事实。
4. ui-plan 必须声明 `mode: source_backed_bootstrap`，并按用例步骤与预期规划真实覆盖：每条在范围内用例的动作步骤都要落为真实页面动作，预期结果都要落为真实业务断言。即便 bootstrap，也不得把计划缩小为「页面可达 + 元素可见」的表层 runner。若真实 UI probe 不支持 PRD 中的深链路，应在 plan-reconcile 中判 `blocked`/`needs_user_decision`，或转诚实排除（记入 `handoff.excluded_cases` + `reason_category` + 原因）；不得降级为弱断言或用弱断言凑通过。
5. 不得生成最终 `archive.md` 或 `test-point-checklist.md`；Playwright 脚本的 SourceRef 必须指向 `prd.md` 或 `source_backed_bootstrap` intent，并在 handoff 中注明 case-draft 仍未完成。

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。

## UI 知识记录

规划选择器、页面结构、站点域行为和踩坑时，须记录入 knowledge 库。

| 类型 | 识别信号 | 示例 |
|---|---|---|
| `selector` | 站点特有的定位器模式 | "该站点所有表格都用 .ant-table 但分页器用 .custom-pager" |
| `page_object` | 页面结构 / 路由 / Fragment | "#/projects 页面有两个 Tab，切换后 URL hash 不变" |
| `site_domain` | 站点域名特有行为 | "该站点登录后 token 存于 sessionStorage 而非 cookie" |
| `pitfall` | UI 自动化踩坑 | "该站点 input 框 change 事件须 dispatch native event" |

通过 `kata knowledge-curate` CLI 写入 `sites/{domain}/` 路径。站点 selector 文件命名约定：`sites/{domain}/selectors.md` 或 `sites/{domain}/dom-{product}.md`。

硬约束：
- 发现新站点选择器模式，须先查询知识库；有匹配则不重复写入。
- 调试 playwright 脚本时，若选择器失败源于 DOM 结构差异，须记录为 `module` 类型写入 `sites/{domain}/`。
- 站点级知识不得写入项目级 overview 或 terms 中。

## dataAssets 前置条件计划

- 将 Archive MD 的通用前置条件规划为 worker-scoped auto fixture。
- 将差异前置条件规划为 case 内步骤或 beforeEach。
- 不使用 `test.beforeAll(async ({ page }) => ...)`；需要浏览器上下文时通过 `browser.newPage({ storageState })` 创建页面。
