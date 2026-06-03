# ui-probe

## 目录

- 读取时机
- 协议
- 输出
- 禁止

## 读取时机

进入 `ui-probe` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

ui-probe 的输入是：ui-plan（规划的断言点）+ env-preflight（已验证的环境 + session）。
输出是：包含 URL、标题、DOM 结构、项目接口、筛选机制、API 证据的 `UiProbeSnapshot@1`。

### Source-backed bootstrap 限制

当 ui-plan 的 mode 是 `source_backed_bootstrap` 时：

1. 只能把当前目标目录的 `prd.md` 与 `inputs/lanhu-snapshots/**` 当作 case_claim/design_source。
2. 不得读取、列举或搜索其他 feature 目录，包括但不限于 `workspace/{project}/features/*/tests/**`、历史 `archive.md`、历史 `prd.md`、历史截图、历史 `metadata.yaml` 和历史 `manifest.json`。
3. 不得拿历史 feature 的测试、page object、fixture 或 selector 当当前 feature 的实现模板。可以读 `_shared/helpers/**`、`_shared/pages/**` 或知识库里的通用事实，但它们只能算 shared API/selector knowledge，替代不了当前的 ui-probe 证据。
4. 要找路由或菜单入口时，必须靠真实 UI 导航、当前 PRD/截图和当前 env profile 来推断；不能靠扫历史 feature 测试反推。

### 第一步：打开目标页面

1. 用 `browser.newContext({ storageState: env.session_path })` 创建浏览器上下文
2. 打开 ui-plan 里的目标 URL hash（如 `#/dq/rule`、`#/metaDataSync`）
3. 等 `networkidle`，再多等 2-3 秒让 Ant Design 渲染完（**仅限 probe 探测脚本**；交付 spec 禁用此 band-aid，改用 web-first 断言）
4. 确认 URL hash 正确，没被重定向到登录页

### 第二步：采集页面证据

按以下顺序逐项采集，每项注明 SourceRef：

> 辅助工具（见 `references/cli-essentials.md`）：
> - snapshot 没暴露的 id/class/data-* 属性，用 `locator.evaluate(el => el.getAttribute(...))` 取。
> - 用 `page.on('console')` / `page.on('requestfailed')` 顺手收集 JS 错误和失败请求，当诊断证据。
> - 注册 `page.on('dialog', d => d.dismiss())`，防原生 dialog 卡死探测流程。
> - 证据不够时，先截图再用 AskUserQuestion 一次问清，不要一轮轮发文字追问。
> - 探测边界态时，可以临时用 `page.route` stub **非被测**依赖；不得改被测业务接口的返回，也不得改页面数据。
> - 可选用 `bunx playwright-cli` 做交互式探索或 codegen 提速（省 token）；但它的输出要按 `references/cli-essentials.md` 文末「可选 @playwright/cli」的边界规则重新落成 probe 证据，替代不了 probe.mjs 证据，也不放宽本阶段 ≤3 脚本预算。
> - 遇 iframe 元素，先用 `page.frames()` 列出所有 frame，再用 `frameLocator` 探测（见 cli-essentials §iframe）。
> - 遇链接触发新标签，用 `waitForEvent('popup')` 捕获（见 cli-essentials §多页）。

| 证据类型 | 采集方法 | 用途 |
|----------|----------|------|
| **URL 和标题** | `page.url()` + `page.title()` | 确认路由正确 |
| **body 文本** | `page.locator("body").innerText()` 截取前 1200 字 | 确认页面内容基座 |
| **表格表头** | `.ant-table-thead th` 的 `evaluateAll` | 验证列结构 |
| **按钮列表** | `page.locator("button")` 的 `evaluateAll` | 验证操作入口 |
| **筛选组件** | `.ant-table-filter-trigger` 点击后读下拉内容 | 验证筛选项 |
| **菜单侧栏** | 侧边栏 `.ant-menu-item` 的文本列表 | 验证导航结构 |
| **表单字段** | `.ant-form-item` 的 `evaluateAll` | 验证表单结构 |

### 第三步：采集 API 证据

用 `page.on('response', ...)` 监听 `/dassets/` API：

```javascript
const apiCalls = [];
page.on('response', async (res) => {
  if (/\/dassets\//.test(res.url())) {
    apiCalls.push({ url: res.url().replace(baseUrl, ''), status: res.status() });
  }
});
```

记录以下关键 API：
- `getProjects` — 项目列表返回
- `getUser` — 用户信息
- `userPermissionList` — 权限结构
- 该页面的核心数据接口（如 `monitor/list`、`metaDataSync/*`）

### 第四步：验证项目上下文

1. 调用 `POST /dassets/v1/valid/project/getProjects` 取项目列表
2. 确认 `project_name` 在返回列表里
3. 页面需要项目上下文时，用 `sessionStorage["X-Valid-Project-ID"] = projectId` 注入
4. 注入后 reload 页面，重新采集证据

### 第五步：记录知识

1. 把发现的 DOM 结构写入 `sites/{domain}/dom-dataAssets.md`：
   ```markdown
   - 页面路由为 `#/xxx`，正文包含 `xxx`。SourceRef: `SR-UI-PROBE-{nnn}`。
   - 表格表头顺序为 `列1`、`列2`...。SourceRef: `SR-UI-PROBE-{nnn}`。
   - `筛选列` 使用 Ant Table filter trigger，筛选项为 `选项1`、`选项2`。SourceRef: `SR-UI-PROBE-{nnn}`。
   ```
2. 用 SourceRef ID 链：`SR-UI-PROBE-{PROBE_SEQ_ID}`（在现有 probe ID 上递增）
3. 用 `kata knowledge-curate` 写入或编辑知识模块

### 第六步：截图证据

给关键页面状态截图：
- 页面初始加载状态
- 筛选组件的展开状态
- 操作弹窗/抽屉（如适用）

截图路径：`results/<run-id>/playwright/ui-probe/{descriptive-name}.png`

### 探测迭代预算

- 每个 ui-probe step 最多写 3 个探测脚本，也最多运行 3 个；写了没运行也算进预算。建议命名为 `probe.mjs`、`probe-retry-2.mjs`、`probe-retry-3.mjs`。第三个脚本之后，不得再写 `probe-selectors.mjs`、`probe4.mjs`、`probe5.mjs`、… 或任何其他补充探测脚本。
- 每次重试前，必须记下上一轮的失败类型：selector、data、permission、environment、product_gap 或 unknown。
- 跑满 3 次仍确认不了核心 UI 事实时，立即停掉 ui-probe，输出 `blocked_by_ui_probe` 或 `needs_user_decision`，进入 plan-reconcile / handoff。此时禁止以下行为：
  - 写第 4 个探测脚本（包括“更精确 DOM 分析”“selector 调试”“数据源选项调试”等）
  - 读取 `playwright-generate` 的 reference
  - 检查或创建 tests、page object
  - 超出 3 轮预算继续探测
  - 在 UI 事实不足时进入 playwright-generate
- 若 ui-probe 已确认目标功能、菜单、规则类型或核心入口在当前环境不存在，立即停下，交给 plan-reconcile 判 blocked；不得再生成自动化脚本去检测“功能是否存在”。

## 输出

写入 `UiProbeSnapshot@1` schema，包含：
- SourceRef（建议格式：`SR-UI-PROBE-{YYYY-MM}-{FEATURE_KEY}-{ENV}`）
- URL 和页面标题
- DOM 证据（表头、按钮、菜单、筛选、表单）
- API 证据（URL 列表、状态码）
- 截图路径
- 项目 API 调用结果

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 探测页面等待时，不得用 `waitForTimeout(2000)` 代替 `waitForLoadState("networkidle")`；探测脚本可以用 networkidle，但**不得把这种写法搬进交付 spec**。
- 不得拿 Screenshot 证据替代 DOM 文本证据（截图只做视觉辅助，断言要靠 DOM 文本）。
- 不得在探查阶段改目标页面的数据（创建、编辑、删除操作）。
- 不得靠读历史 feature 测试或截图来补当前 ui-probe 证据的不足。
- 不得不管预算地一个接一个写 `probeN.mjs` 探测脚本。
