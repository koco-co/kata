# playwright-generate

## 读取时机

进入 `playwright-generate` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

进入本文件前必须已完成本轮 plan-reconcile，且 status 必须为 `aligned` 或 `plan_adjusted`。若 status 为 `blocked`、`blocked_by_ui_probe`、`needs_user_decision`，或 ui-probe 因 3 次探测预算耗尽而没有确认核心 UI 事实，禁止读取本文件；已经误读本文件时也必须立即停止，不得检查/创建 tests、page object、runner 或“预自动化脚本”，直接回到 handoff 输出阻塞证据。

## Reverse-traceability header (mandatory)

Every generated `t*.ts` file MUST begin with 5 single-line comments before any imports:

```ts
// spec: features/<featureId>/archive.md#case=<case-id>
// intent: SR-INTENT-<id>
// probe: SR-UI-PROBE-<id>
// page: _shared/pages/<page-domain>-page.ts
// generated_at: <ISO8601 UTC timestamp>
```

`page:` lines reference `_shared/pages/`. If multiple pages are used, list one per line:
```ts
// page: _shared/pages/dq-rule-page.ts
// page: _shared/pages/dq-task-page.ts
```

Quality gate `case_traceability_header` rejects specs missing any of these lines.

When `mode: source_backed_bootstrap` is used and `archive.md` does not exist yet, the `spec:` line MUST point to the current target source instead:

```ts
// spec: features/<featureId>/prd.md#source-backed-bootstrap
```

This does not mark case-draft complete; handoff must say the script was generated from source-backed bootstrap evidence and still needs `/case-draft` for final archive traceability.

## 输出

## 输出

- 写入对应 schema。
- 保留 SourceRef。
- 区分 case_claim、observed_ui、environment、run_artifact 与 product_knowledge。

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。

## 覆盖忠实度（强制）

生成的每条 spec 必须忠实于源用例：

- 用例的每个动作步骤（创建/导入/运行/下载/编辑/删除等）必须落为真实页面动作，不得丢弃；
- 用例写明的 `expected_visible_result`/预期结果必须断言为真实业务结果，禁止用 `toBeVisible`/`toContainText` 等可见性/存在性断言代替；
- 禁止把业务流程用例简化为「进入页面看菜单/字段/元素是否存在」的 surface 契约测试；
- 当前环境确实无法忠实实现并跑通的用例，走诚实阻塞/排除并记入 `handoff.excluded_cases`（含 `reason_category` + 原因），不得用 surface 断言假通过。

> 断言工具（见 `references/cli-essentials.md`）：断言优先 `toMatchAriaSnapshot`/`toHaveText`/`toHaveValue` 强断言，期望值用 `locator.textContent()/inputValue()` 在 ui-probe 阶段捕获；locator 优先 `getByRole/getByTestId/getByLabel`。**不得用 `page.route` mock 被测业务接口返回来换取断言通过。** 凡来自 `@playwright/cli` codegen 的 locator 或代码片段，落 spec 前必须对照 ui-probe 证据重新验证，并改写为项目约定（语义 locator、可追溯头、`_shared/pages/` 落位）；codegen 产出是草稿，不是可直接交付的 spec。

## 生成与调试协议

### 模式判定

进入 skill 后，首动作不是写代码，而是探测已有脚本：

1. 检查 `workspace/{project}/features/{feature}/tests/` 是否存在
2. 列出现有 `*.spec.ts` / `*.spec.js` 和 `tests/cases/` 下文件
3. 对每个 spec 文件执行内容检查：
   - **真实测试**：包含 `test(` 块且有 `expect(` 断言
   - **scaffold**：仅 import 语句、空 describe、空 test 块
   - **不存在**：文件不存在

4. **调试模式**（以下任一满足）：
   - 有 >=1 个真实测试文件（包含 `test(` + `expect(`）
   - 有 >=1 个 runner 文件且包含非 import 的内容
   
   调试模式行为：
   - **不得覆写任何现有文件**
   - 先运行 `full.spec.ts --list` 确认聚合完整性
   - 再运行 `full.spec.ts` 观察失败
   - 对失败做 triage。script 类失败进入 repair-loop
   - 新写修复：只修改失败 spec，不修改已通过的 spec
   - **禁止**：以"重新组织"为由删除/替换现有 working spec

5. **生成模式**（以下全部满足）：
   - 无任何真实测试文件
   - 无 runner 文件或仅有空/注释 runner
   
   生成模式行为：
   - 从 ui-probe 证据和 archive.md 中提取 P0 用例；若处于 `source_backed_bootstrap`，只能从当前目标 `prd.md` + ui-probe 证据中提取最小 P0 用例，并在代码头部使用 `prd.md#source-backed-bootstrap`
   - 先写 `tests/runners/smoke.spec.ts` + `full.spec.ts`（仅 import）
   - 再写 `tests/cases/t01-{slug}.ts`
   - RED → GREEN 节律逐个验证

### 模式防范：storageState 路径污染

生成 case 文件时，**禁止使用其他 feature 中看到的 root-level auth session 作为 storageState 路径**。

发现路径污染的方法：
- legacy feature case 文件曾使用错误的 root-level auth session（缺少 `workspace/{project}/.kata/auth/` 前缀）
- 当你参考现有 feature 模式时，必须使用当前 env profile 的正确 session 路径
- 正确路径：repo-root 相对 `workspace/{project}/.kata/auth/{project}/session-{env}.json`，并通过当前 env profile 的 `auth.session_path` 引用。

```bash
# 检查 session 路径是否正确
grep -c "root-level auth session" tests/cases/*.ts 2>/dev/null  # 应为 0
grep -c "workspace/.*/.kata/auth/.*/session-" tests/cases/*.ts 2>/dev/null  # 应 > 0
```

### 目录与 runner 约束

- feature 自动化必须遵循 `tests/{cases,runners,data,unit,.debug}` 结构；共享页面对象与 helper 只允许位于 `workspace/<project>/_shared/pages/` 或 `workspace/<project>/_shared/helpers/`。
- `tests/runners/smoke.spec.ts` 与 `tests/runners/full.spec.ts` 只做聚合 import；不得把长测试体直接写进 runner。
- P0/P1 具体用例写入 `tests/cases/t{nn}-{slug}.ts`，共享页面对象写入 `_shared/pages/`，共享接口/模板解析 helper 写入 `_shared/helpers/`。
- 新生成脚本不得只交付 smoke；必须同时提供 full runner。若 full 因产品/环境阻塞不能覆盖深链路，必须在 handoff 中写明阻塞分类和已运行命令。

### RED -> GREEN 节律

对每条 case 严格执行：
1. **RED**：写/选定 spec，运行 `playwright test <single-file> --headed`。
2. **观察失败原因**：先读 trace/截图/console，判断是 selector/数据/时序/真 bug。
3. **修复**：能在 spec 内修就修；涉及测试数据 fixture 缺失或前置条件，能修就修。
4. **GREEN**：单 spec 重跑，必须 PASS 才算完成。

### 等待策略（代替 waitForTimeout）

在 RED→GREEN 节律中，等待条件必须使用以下可靠方式，禁止使用固定延时 `waitForTimeout` 作为等待条件：

| 场景 | 正确方式 | 禁止方式 |
|------|----------|----------|
| 页面加载完成 | `expect(locator).toBeVisible({ timeout: 15000 })` / `page.waitForResponse()` / `page.waitForURL()` | `page.waitForLoadState("networkidle")`（band-aid，§9 明令禁止）/ `page.waitForTimeout(3000)` |
| 元素可见 | `expect(locator).toBeVisible({ timeout: 15000 })` | `page.waitForTimeout(2000)` |
| 导航完成 | `page.waitForURL()` | 裸 `waitForTimeout` |
| API 响应到达 | `page.waitForResponse()` | `waitForTimeout` |
| 元素消失 | `expect(locator).not.toBeVisible()` | `waitForTimeout` 猜测渲染完毕 |
| 动画/过渡完成 | 使用 `transitionend` 事件或 `waitForFunction` | `waitForTimeout(1000)` 硬等 |

`waitForTimeout` 仅在以下场景允许：
- 触发 Ant Design 级联选择器的下拉过渡（`waitForTimeout(500)` + 注释说明）
- 等待浏览器渲染帧完成（`waitForTimeout(100)` + 注释说明）
- 其他无法用 Promise 事件替代的极少数情况

其他任何场景使用 `waitForTimeout` 作为主要等待策略，视为质量门禁违规。

### 升级（问用户）前置检查清单

升级条件：P0 case 失败 >=2 轮自修无效时停下来问用户。

升级前必须完成全部检查，并把结果作为提问消息的一部分：
- [ ] 已读 spec 完整源码
- [ ] 已对当前 case 用 `--list` + headless 至少各跑 1 次，附错误输出片段
- [ ] 已检查 `workspace/{project}/.kata/auth/` storage state 是否存在且未过期
- [ ] 已比对 baseline case 的 selector/等待/fixture 模式，并说明本 case 哪里偏离
- [ ] 已识别失败类型（selector/数据/时序/环境/真 bug），并陈述判断依据
- [ ] 已列出主会话不可控的外部依赖（后端服务/测试账号/数据准备/网络）

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

### 部分参考

参考 `playwright-automation@1` 的 `per-case-debug-sop.md` 完整内容。

## UI 知识沉淀

调试 playwright 脚本时，若选择器失败源于 DOM 结构差异，须沉淀为 `module` 类型写入 `sites/{domain}/`。

查询已有知识：
```bash
kata knowledge-curate read-module --project {{project}} --module sites/domain.com/selectors
kata knowledge-curate read-pitfall --project {{project}} --query "selector"
```

硬约束：
- 发现新站点选择器模式，须先查询知识库；有匹配则不重复写入
- 站点级知识不得写入项目级 overview 或 terms 中

## Page object location (mandatory)

- ALL page objects live in `workspace/<project>/_shared/pages/<page-domain>-page.ts`.
- It is **forbidden** to create or modify feature-local helper directories; shared page objects belong under `workspace/<project>/_shared/pages/<featureId>/`, and shared helpers belong under `workspace/<project>/_shared/helpers/`.
- When a page object for the target domain already exists, REUSE it; do not regenerate or fork.
- Shared helper changes must live in `workspace/<project>/_shared/helpers/`.
- New page objects must update `_shared/pages/INDEX.md`.

Quality gate `no_feature_local_helpers` enforces this.
