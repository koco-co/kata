# Playwright API 速查

完整 API 见 https://playwright.dev/docs/api/class-page。交付脚本一律用原生 `@playwright/test`。

## 探测上下文与证据采集

```javascript
const context = await browser.newContext();
// cookie 从 kata env run 注入的运行时配置解析，不直接读 YAML、不打印
await context.addCookies(cookies);
const page = await context.newPage();
await page.goto(targetUrl);

// API 证据：被动监听，不拦截
const apiCalls = [];
page.on("response", (res) => {
  if (/\/dassets\//.test(res.url())) apiCalls.push({ url: res.url(), status: res.status() });
});
// 诊断
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("requestfailed", (req) => consoleErrors.push(`FAILED ${req.url()}`));
// Dialog 防卡
page.on("dialog", (d) => d.dismiss());

// 一次 ariaSnapshot 拿整棵 role+name 语义树，比分散采集省 token
const tree = await page.locator("main, .ant-layout-content").ariaSnapshot();
// a11y 缺口（icon-only 按钮、未关联 label）回退 DOM 取文本
const buttons = await page.locator("button").evaluateAll((els) => els.map((e) => e.textContent?.trim()));
// snapshot 拿不到的属性用 evaluate 读
const testId = await page.locator('[aria-label="提交"]').evaluate((el) => el.getAttribute("data-testid"));
```

## Locator 与断言

```typescript
page.getByRole("button", { name: "提交" });
page.getByLabel("用户名");
page.getByTestId("submit-button"); // role/text 歧义时的备选

await expect(page.getByRole("table")).toMatchAriaSnapshot(`
  - rowgroup:
    - row "规则名称 状态 操作"
`);
await expect(page.getByTestId("rule-status")).toHaveText("启用");
await expect(page.getByTestId("result-panel")).toBeVisible(); // 最弱选择，少用
```

## 请求 mock（page.route）

只用于探测边界态、隔离不稳定的外部依赖、构造前置数据。**禁止 mock 被测业务接口的返回来让断言通过。**

```javascript
await page.route("**/*.{png,jpg,svg}", (route) => route.fulfill({ status: 404 })); // 静态资源屏蔽
await page.route("**/api/slow", (route) => route.abort("internetdisconnected")); // 注入失败态
await page.unrouteAll(); // 用完清理
```

## iframe / popup / 下载

```typescript
// iframe：先 page.frames() 确认 URL，再 frameLocator 链式操作
const frame = page.frameLocator('iframe[src*="/embed/"]');
await frame.getByRole("heading").click();

// popup：监听必须在触发动作之前注册
const [popup] = await Promise.all([
  page.waitForEvent("popup"),
  page.getByRole("link", { name: "查看" }).click(),
]);

// 下载
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "导出" }).click(),
]);
await download.saveAs(`runs/<run-id>/downloads/${download.suggestedFilename()}`);
```

## Tracing

```typescript
await context.tracing.start({ screenshots: true, snapshots: true });
// ... 用例逻辑 ...
await context.tracing.stop({ path: "runs/<run-id>/trace/trace.zip" });
```
