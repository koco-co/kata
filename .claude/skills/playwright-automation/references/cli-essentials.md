# Playwright 原生 API 速查

kata playwright-automation 的真实工作流：写 `probe.mjs`（`browser.newContext` + `page.on` + `page.locator`）和 `.spec.ts` 测试文件，通过 `npx playwright test` 执行。**交付脚本一律用原生 `@playwright/test`**；`@playwright/cli` 仅作 §4 ui-probe 阶段的可选交互探索工具，其产物不直接进交付物（边界规则见文末）。

完整 Playwright API 见 https://playwright.dev/docs/api/class-page。

## 目录

- 探测上下文与证据采集（§4 ui-probe 用）
- 元素属性检视（§4 ui-probe 用）
- Locator 与强断言（§6 playwright-generate 用）
- 请求 mock（page.route）
- iframe / frameLocator
- 多页 / popup 处理
- 文件下载处理
- Tracing 与 Video
- 用户视觉确认
- 可选：`@playwright/cli` 交互式探索（仅 §4 ui-probe，禁止进交付物）

## 探测上下文与证据采集（§4 ui-probe 用）

```javascript
// 通过项目 runtime resolver 解析基础 profile + .local cookie；禁止直接读 YAML 或输出 cookie
const runtime = resolveDataAssetsRuntime();
const context = await browser.newContext();
const cookies = runtime.auth.cookie.split(";").map((item) => {
  const separator = item.indexOf("=");
  return { name: item.slice(0, separator).trim(), value: item.slice(separator + 1), url: runtime.urls.baseUrl };
});
await context.addCookies(cookies);
const page = await context.newPage();
await page.goto(targetUrl);
await page.waitForLoadState("networkidle"); // probe 探测可用；交付 spec 改 web-first 断言（见 §6 等待策略表）

// API 证据采集——被动监听，不拦截
const apiCalls = [];
page.on("response", async (res) => {
  if (/\/dassets\//.test(res.url()))
    apiCalls.push({ url: res.url().replace(baseUrl, ""), status: res.status() });
});

// 控制台错误与失败请求诊断（§9 repair-loop 也适用）
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("requestfailed", (req) => { consoleErrors.push(`FAILED ${req.method()} ${req.url()} — ${req.failure()?.errorText}`); });

// Dialog 防卡
page.on("dialog", (d) => d.dismiss());

// 主采集：一次 ariaSnapshot 拿整棵 role+name 语义树（按钮/表格列/菜单/表单/标题），比分散 DOM 采集省 token
const tree = await page.locator("main, .ant-layout-content").ariaSnapshot();

// a11y 缺口兜底：icon-only 按钮无 name、Form.Item label 未关联控件时，回退 DOM 取文本
const headers = await page.locator(".ant-table-thead th").evaluateAll((els) => els.map((e) => e.textContent?.trim()));
const buttons = await page.locator("button").evaluateAll((els) => els.map((e) => e.textContent?.trim()));
```

## 元素属性检视（§4 ui-probe 用）

snapshot 未暴露 `id`/`class`/`data-*`/计算样式时，用 `evaluate` 直接读 DOM：

```javascript
// data-testid（a11y 树拿不到，用 DOM 兜底取）
const testId = await page
  .locator('[aria-label="提交"]')
  .evaluate((el) => el.getAttribute("data-testid"));

// id、class、aria-label
const id = await page.locator(".target").evaluate((el) => el.id);
const cls = await page.locator(".target").evaluate((el) => el.className);
const label = await page
  .locator("button")
  .first()
  .evaluate((el) => el.getAttribute("aria-label"));

// 计算样式（确认元素是否实际渲染可见）
const display = await page
  .locator(".panel")
  .evaluate((el) => getComputedStyle(el).display);

// 批量取所有匹配元素的某属性
const testIds = await page
  .locator("[data-testid]")
  .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
```

**定位点优先级**：`getByRole`(role+name) > `getByLabel`/`getByPlaceholder` > `getByText` > `getByTestId` > CSS class（避免动态 hash class）。

## Locator 与强断言（§6 playwright-generate 用）

```typescript
// 优先语义 locator（比 CSS 稳定）；完整顺序见上文「定位点优先级」
page.getByRole("button", { name: "提交" });
page.getByLabel("用户名");
page.getByText("启用");
page.getByTestId("submit-button"); // role/text 歧义或不稳时的兜底钩子

// 在 ui-probe 阶段捕获期望值（用于写断言）
const text = await page.locator('[data-testid="status"]').textContent(); // → toHaveText
const value = await page.locator('input[name="ruleCode"]').inputValue(); // → toHaveValue

// 断言优先级：从强到弱，尽量用最强匹配
await expect(page.getByRole("table")).toMatchAriaSnapshot(`
  - rowgroup:
    - row "规则名称 状态 操作"
`);
await expect(page.locator('[data-testid="rule-status"]')).toHaveText("启用");
await expect(page.locator('input[name="ruleCode"]')).toHaveValue("DQ_001");
await expect(page.locator('[data-testid="checkbox"]')).toBeChecked();
await expect(page.locator('[data-testid="result-panel"]')).toBeVisible(); // 仅兜底
```

`toMatchAriaSnapshot` 要点：只写断言所需的关键节点，不要求全量 snapshot；不稳定值（ID、时间戳）用正则（`/ \d+ 条记录/`）；文本断言时 locator 不应包含被断言文本本身（优先 `getByTestId`/`getByLabel` + `toHaveText`）。

## 请求 mock（page.route）

> ⚠️ **使用边界**：仅用于探测边界态、隔离不稳定的第三方/非被测依赖、构造前置数据态。
> **禁止 mock 被测业务接口的返回来让断言通过。**

```javascript
// 静态 stub（屏蔽外部图片/资源）
await page.route("**/*.{png,jpg,svg}", (route) =>
  route.fulfill({ status: 404 }),
);

// 条件响应（按请求体分流）
await page.route("**/api/login", (route) => {
  const body = route.request().postDataJSON();
  route.fulfill(
    body.username === "admin"
      ? { body: JSON.stringify({ token: "mock-token" }) }
      : { status: 401, body: JSON.stringify({ error: "Invalid" }) },
  );
});

// 改写真实响应（保留真实调用，仅修改部分字段）
await page.route("**/api/user", async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  await route.fulfill({ response, json: { ...json, isPremium: true } });
});

// 注入失败态（探测错误处理路径）
// abort reason: connectionrefused | timedout | connectionreset | internetdisconnected
await page.route("**/api/slow-resource", (route) =>
  route.abort("internetdisconnected"),
);

// 延时模拟（探测加载状态 UI）
await page.route("**/api/heavy", async (route) => {
  await new Promise((r) => setTimeout(r, 3000));
  await route.fulfill({ body: JSON.stringify({ data: [] }) });
});

// 清理（测试结束或不再需要时）
await page.unroute("**/api/login");
await page.unrouteAll();
```

URL pattern 速查：`**/api/users`（精确路径）、`**/api/*/details`（通配段）、`**/*.{png,jpg}`（扩展名）、`**/search?q=*`（含参数）。

## iframe / frameLocator（§4 ui-probe + §6 generate 用）

```javascript
// 按 selector 定位 iframe 内元素（frameLocator 返回 Locator，支持链式断言）
const frame = page.frameLocator('iframe[name="report"]');
await frame.locator('[data-testid="table-row"]').first().click();
await expect(frame.getByRole("heading")).toHaveText("报表标题");

// 按 src URL 定位（动态 name 的第三方嵌入）
const frameByUrl = page.frameLocator('iframe[src*="/embed/"]');
```

探测时遇到 iframe 元素：先 `page.frames()` 列出所有 frame URL 确认目标，再用 `frameLocator` 采集证据。

## 多页 / popup 处理（§4 ui-probe + §6 generate 用）

```typescript
// 必须在触发动作之前注册监听，否则错过 popup 事件
const [popup] = await Promise.all([
  page.waitForEvent("popup"),
  page.getByRole("link", { name: "在新标签打开" }).click(),
]);
await popup.waitForLoadState();
await expect(popup.getByRole("heading")).toHaveText("详情页标题");
await expect(popup).toHaveURL(/\/detail\//);
```

**步骤与断言的真实性**：用例含「导出/详情/查看新开页」时必须在 popup 页断言业务结果，不得只断当前页。

## 文件下载处理（§6 playwright-generate 用）

```typescript
// 必须在触发动作之前注册监听
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出" }).click();
const download = await downloadPromise;
await download.saveAs(`runs/${runId}/playwright/downloads/${download.suggestedFilename()}`);
expect(download.suggestedFilename()).toMatch(/^report_\d{8}\.xlsx$/);
// download.path() = 临时路径（context 关闭前有效）；download.failure() 可取失败原因
```

## Tracing 与 Video（context 选项形式）

```javascript
// Tracing：context 层面控制，覆盖完整执行流程
await context.tracing.start({ screenshots: true, snapshots: true });
// … 操作 …
await context.tracing.stop({ path: `runs/${runId}/playwright/trace.zip` });

// 或在 playwright.config.ts 全局开启（推荐 CI）
// use: { trace: 'on-first-retry' }

// Video：录制回放证据，context.close() 时自动落盘
const context = await browser.newContext({
  recordVideo: {
    dir: `runs/${runId}/playwright/videos/`,
    size: { width: 1280, height: 800 },
  },
});
await context.addCookies(cookies);
```

**取舍**：trace 调试失败步骤（DOM snapshot + 网络 + 时间线）；video 演示/hand-off 证据；screenshot 即时取证。**清理**：`find runs -name "*.zip" -o -name "*.webm" | xargs -I{} find {} -mtime +7 -delete`。

## 用户视觉确认
证据不足时的原生方案：

```typescript
// 截图后通过 AskUserQuestion 让用户描述目标入口
await page.screenshot({
  path: `runs/${runId}/playwright/ui-probe/page-current.png`,
  fullPage: true,
});
// → AskUserQuestion：「截图已保存，请描述目标操作入口的文字/位置」

// 对疑似区域截图（缩小范围后）
await page.locator('[data-testid="toolbar"]').screenshot({ path: "..." });
```

**原则**：遇到「找不到操作入口」先截图，再一次性问清楚，不得多轮文字追问。

带标注的演示视频（`showChapter`/`showOverlay`）可用 `@playwright/cli` 的 `run-code` 实现，属于**可选演示产物**，不是交付物必需。

## 可选：`@playwright/cli` 交互式探索（仅 §4 ui-probe，禁止进交付物）

`@playwright/cli`（`bunx playwright-cli`，0.1.x 早期 API）已作为 devDependency 安装，可在 §4 阶段作为省 token 的交互探索工具。**以下边界必须遵守**：

1. **仅用于 ui-probe 阶段**的交互探索、页面 snapshot、codegen 起草 locator，不用于任何其他阶段。
2. **禁止用 named session / `state-save` / `attach --cdp` 管理交付会话**。会话状态一律通过项目 runtime resolver 解析基础 profile 与 `.local` cookie，再用 `browserContext.addCookies` 注入（§2 env-preflight 规则）。
3. **codegen / snapshot 产出是草稿**：必须经 ui-probe 真实证据（DOM 文本 / API）重新验证、改写为项目约定（语义 locator、可追溯头、`_shared/pages/` 落位）才能进 spec。
4. **不替代 `probe.mjs` 证据要求**，也不绕过「每 ui-probe step ≤3 个探测脚本」预算。

```bash
# 探索示例（ui-probe 阶段可用）
bunx playwright-cli open https://example.com
bunx playwright-cli snapshot          # 查看可访问性树，辅助选择 locator
# codegen 产出仅供参考，改写为 probe.mjs + .spec.ts 后才算证据
```
