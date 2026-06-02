# playwright-generate

## 目录

- 读取时机
- 反向可追溯头（强制）
- 输出
- 禁止
- 步骤与断言的真实性（强制）
- 生成与调试协议
- UI 知识记录
- page object 位置（强制）

## 读取时机

进入 `playwright-generate` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

进入本文件前，本轮 plan-reconcile 必须已完成，且 status 必须是 `aligned` 或 `plan_adjusted`。若 status 是 `blocked`、`blocked_by_ui_probe`、`needs_user_decision`，或 ui-probe 耗尽 3 次探测预算仍没确认核心 UI 事实，则禁止读本文件；万一已经误读，也要立即停下，不得检查或创建 tests、page object、runner 或“预自动化脚本”，直接回到 handoff 输出阻塞证据。

## 反向可追溯头（强制）

每个生成的 `t*.ts` 文件，必须在任何 import 之前，先写 5 行单行注释：

```ts
// spec: features/<featureId>/archive.md#case=<case-id>
// intent: SR-INTENT-<id>
// probe: SR-UI-PROBE-<id>
// page: _shared/pages/<page-domain>-page.ts
// generated_at: <ISO8601 UTC timestamp>
```

`page:` 行引用 `_shared/pages/`。用到多个 page 时，每行写一个：
```ts
// page: _shared/pages/dq-rule-page.ts
// page: _shared/pages/dq-task-page.ts
```

检查项 `case_traceability_header` 会拒收缺了其中任一行的 spec。

走 `mode: source_backed_bootstrap`、且 `archive.md` 还不存在时，`spec:` 行必须改成指向当前目标源：

```ts
// spec: features/<featureId>/prd.md#source-backed-bootstrap
```

这不代表 case-draft 已完成；handoff 必须说明脚本是由 source-backed bootstrap 证据生成的，最终归档的可追溯性还得靠 `/case-draft` 补齐。

## 输出

- 写入对应 schema。
- 保留 SourceRef。
- 区分 case_claim、observed_ui、environment、run_artifact 和 product_knowledge。

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。

## 步骤与断言的真实性（强制）

生成的每条 spec 必须真实还原源用例：

- 用例的每个动作步骤（创建/导入/运行/下载/编辑/删除等）都必须落成真实页面动作，一个都不能丢；
- 用例写明的 `expected_visible_result`/预期结果，必须断言成真实业务结果，不得用 `toBeVisible`/`toContainText` 这类可见性/存在性断言顶替；
- 不得把业务流程用例简化成「进页面看看菜单/字段/元素在不在」的表层测试——只测页面表层、不测业务结果；
- 用例含「导出/详情/查看在新标签打开」时，必须用 popup 模式捕获新页（见 cli-essentials §多页），并在新页里断言业务结果，不能只断当前页还看得见某按钮；
- 当前环境确实没法真实实现并跑通的用例，走诚实阻塞/排除，记入 `handoff.excluded_cases`（含 `reason_category` + 原因），不得用表面通过糊弄。

> 断言工具（见 `references/cli-essentials.md`）：断言优先用 `toMatchAriaSnapshot`/`toHaveText`/`toHaveValue` 这类强断言，期望值在 ui-probe 阶段用 `locator.textContent()/inputValue()` 捕获；locator 优先 `getByRole/getByTestId/getByLabel`。**不得用 `page.route` mock 被测业务接口的返回来换断言通过。** 凡是 `@playwright/cli` codegen 出来的 locator 或代码片段，落 spec 前都要对照 ui-probe 证据重新验证，并改写成项目约定（语义 locator、可追溯头、落在 `_shared/pages/`）；codegen 产出是草稿，不是能直接交付的 spec。

## 生成与调试协议

### 模式判定

进入 skill 后，第一个动作不是写代码，而是探测已有脚本：

1. 检查 `workspace/{project}/features/{feature}/tests/` 在不在
2. 列出现有 `*.spec.ts` / `*.spec.js` 和 `tests/cases/` 下的文件
3. 逐个检查 spec 文件的内容：
   - **真实测试**：含 `test(` 块且有 `expect(` 断言
   - **scaffold**：只有 import 语句、空 describe、空 test 块
   - **不存在**：文件不存在

4. **调试模式**（满足以下任一）：
   - 有 >=1 个真实测试文件（含 `test(` + `expect(`）
   - 有 >=1 个 runner 文件、且含非 import 的内容
   
   调试模式怎么做：
   - **不得覆写任何现有文件**
   - 先跑 `full.spec.ts --list` 确认聚合完整
   - 再跑 `full.spec.ts` 看失败
   - 给失败做 triage；script 类失败进入 repair-loop
   - 写修复时只改失败的 spec，不动已通过的 spec
   - **禁止**：以「重新组织」为由删除或替换现有的 working spec

5. **生成模式**（以下全部满足）：
   - 没有任何真实测试文件
   - 没有 runner 文件，或只有空的/带注释的 runner
   
   生成模式怎么做：
   - 从 ui-probe 证据和 archive.md 里提取 P0 用例；处于 `source_backed_bootstrap` 时，只能从当前目标 `prd.md` + ui-probe 证据里提取最小 P0 用例，并在代码头部用 `prd.md#source-backed-bootstrap`
   - 先写 `tests/runners/smoke.spec.ts` + `full.spec.ts`（仅 import）
   - 再写 `tests/cases/t01-{slug}.ts`
   - 按 RED → GREEN 节律逐个验证

### 模式防范：storageState 路径污染

生成 case 文件时，**禁止拿在别的 feature 里看到的 root-level auth session 当 storageState 路径**。

怎么发现路径污染：
- 老的 feature case 文件曾用过错误的 root-level auth session（少了 `workspace/{project}/.kata/auth/` 前缀）
- 参考现有 feature 的写法时，必须用当前 env profile 的正确 session 路径
- 正确路径：repo-root 相对的 `workspace/{project}/.kata/auth/{project}/session-{env}.json`，并通过当前 env profile 的 `auth.session_path` 引用。

```bash
# 检查 session 路径是否正确
grep -c "root-level auth session" tests/cases/*.ts 2>/dev/null  # 应为 0
grep -c "workspace/.*/.kata/auth/.*/session-" tests/cases/*.ts 2>/dev/null  # 应 > 0
```

### 目录与 runner 约束

- feature 自动化必须遵循 `tests/{cases,runners,data,unit,.debug}` 结构；共享页面对象和 helper 只能放在 `workspace/<project>/_shared/pages/` 或 `workspace/<project>/_shared/helpers/`。
- `tests/runners/smoke.spec.ts` 与 `tests/runners/full.spec.ts` 只做聚合 import；不得把长测试体直接写进 runner。
- P0/P1 的具体用例写进 `tests/cases/t{nn}-{slug}.ts`，共享页面对象写进 `_shared/pages/`，共享接口/模板解析 helper 写进 `_shared/helpers/`。
- 新生成的脚本不得只交付 smoke；必须同时给出 full runner。若 full 因产品或环境阻塞而覆盖不了深链路，必须在 handoff 里写明阻塞分类和已运行的命令。
- **串行标注**：有共享状态、有创建-校验-删除链路、或依赖项目上下文的 case，必须在 `test.describe()` 标题或 `test()` 名称里带 `@serial` 标签（`scripts/run-tests-notify.ts` 的 two-phase runner 会把这类用例挑出来，强制 `workers=1` 串行跑，避免数据互污）。case 之间用 `beforeEach`/`afterEach` 干净地恢复前置态，不依赖执行顺序。

### RED -> GREEN 节律

对每条 case 严格按下面走：
1. **RED**：写好或选定 spec，运行 `playwright test <single-file> --headed`。
2. **看失败原因**：先读 trace/截图/console，判断是 selector、数据、时序还是真 bug。
3. **修复**：能在 spec 内修就修；缺测试数据 fixture 或前置条件，能修也修。
4. **GREEN**：单 spec 重跑，必须 PASS 才算完成。

### 等待策略（代替 waitForTimeout）

RED→GREEN 节律里的等待条件，必须用下面这些可靠写法，禁止拿固定延时 `waitForTimeout` 当等待条件：

| 场景 | 正确方式 | 禁止方式 |
|------|----------|----------|
| 页面加载完成 | `expect(locator).toBeVisible({ timeout: 15000 })` / `page.waitForResponse()` / `page.waitForURL()` | `page.waitForLoadState("networkidle")`（band-aid，§9 明令禁止）/ `page.waitForTimeout(3000)` |
| 元素可见 | `expect(locator).toBeVisible({ timeout: 15000 })` | `page.waitForTimeout(2000)` |
| 导航完成 | `page.waitForURL()` | 裸 `waitForTimeout` |
| API 响应到达 | `page.waitForResponse()` | `waitForTimeout` |
| 元素消失 | `expect(locator).not.toBeVisible()` | `waitForTimeout` 猜测渲染完毕 |
| 动画/过渡完成 | 使用 `transitionend` 事件或 `waitForFunction` | `waitForTimeout(1000)` 硬等 |

`waitForTimeout` 只在以下场景允许：
- 触发 Ant Design 级联选择器的下拉过渡（`waitForTimeout(500)` + 注释说明）
- 等浏览器渲染帧完成（`waitForTimeout(100)` + 注释说明）
- 其他无法用 Promise 事件替代的极少数情况

在别的任何场景把 `waitForTimeout` 当主要等待策略，都算质量检查项违规。

### 升级（问用户）前置检查清单

升级条件：P0 case 失败、自修 >=2 轮仍无效时，停下来问用户。

升级前必须完成全部检查，并把结果写进提问消息：
- [ ] 已读 spec 完整源码
- [ ] 已对当前 case 用 `--list` + headless 至少各跑 1 次，附上错误输出片段
- [ ] 已检查 `workspace/{project}/.kata/auth/` 的 storage state 在不在、有没有过期
- [ ] 已比对 baseline case 的 selector/等待/fixture 写法，说明本 case 哪里偏了
- [ ] 已判定失败类型（selector/数据/时序/环境/真 bug），并说清判断依据
- [ ] 已列出主会话管不了的外部依赖（后端服务/测试账号/数据准备/网络）

### 严禁动作

| 严禁 | 原因 |
|------|------|
| `bun test` / `playwright test` 不带文件参数全量重跑做调试 | 浪费时间，丢失失败信号 |
| 只生成或只运行 `smoke.spec.ts` 就交付端到端自动化 | smoke 只能证明基座，不能证明 full 回归入口可运行 |
| 把测试主体直接写进 `tests/runners/full.spec.ts` / `smoke.spec.ts` | runners 是聚合入口；测试体应在 cases/ |
| 用 `?.[0] ?? []` 或 `if (x)` 守卫替换失败的断言 | 等于把测试改成永远 pass，掩盖真 bug |
| `page.waitForTimeout(N)` 代替等待特定 UI 条件 | 固定延时不可靠，应等待元素可见、网络空闲或特定响应；仅在触发动画/过渡时必须使用，且需注释说明原因 |
| 覆写未读过的已有 spec 文件 | 可能丢失上一会话的调试成果或人工修正 |
| 派发「跑通整个 suite」这种粗粒度 subagent | 黑盒长跑，用户看不到进度 |
| `--headless` 模式无声调试 | 用户无法协助排查 selector/时序问题 |
| 跑通全部 case 后一次性 commit | 失败时回滚困难；进度对用户不可见 |
| 未完成环境探测就声称「环境不可用」 | 抽象判断不构成升级条件 |
| 给用户的选项里包含不确定语（需核对/待确认） | 选项 = 已 ready 的决策点 |

## UI 知识记录

调试 playwright 脚本时，选择器失败如果是 DOM 结构差异引起的，记成 `module` 类型写入 `sites/{domain}/`。

查询已有知识：
```bash
kata knowledge-curate read-module --project {{project}} --module sites/domain.com/selectors
kata knowledge-curate read-pitfall --project {{project}} --query "selector"
```

硬约束：
- 发现新的站点选择器模式时，先查知识库；已有匹配就不重复写入
- 站点级知识不得写进项目级 overview 或 terms

## page object 位置（强制）

- 所有 page object 一律放在 `workspace/<project>/_shared/pages/<page-domain>-page.ts`。
- **禁止**创建或修改 feature 本地 helper 目录；共享 page object 归 `workspace/<project>/_shared/pages/<featureId>/`，共享 helper 归 `workspace/<project>/_shared/helpers/`。
- 目标 domain 已有 page object 时必须复用，不得重新生成或另起一份。
- 共享 helper 的改动必须落在 `workspace/<project>/_shared/helpers/`。
- 新增 page object 必须更新 `_shared/pages/INDEX.md`。

检查项 `no_feature_local_helpers` 强制此约束。
