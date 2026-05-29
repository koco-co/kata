# Playwright CLI 速查

本文件是 Phase 1 删 playwright-cli 后保留的 CLI 速查；完整 playwright SDK 文档见 https://playwright.dev/docs/api/class-page。
本文件仅覆盖 playwright-automation 在生成、修复、自检自动化时常用的 4 个 CLI 子主题；CLI 安装与高级用法回看 https://playwright.dev/docs/intro。

## Base commands

最常用的浏览器驱动命令；ref（如 `e5`）来自 `snapshot` 输出，可与 css/role/testid locator 并用。

```bash
# 会话生命周期
playwright-cli open                       # 打开默认浏览器
playwright-cli open https://example.com   # 打开并跳转
playwright-cli goto https://example.com   # 已打开的会话内跳转
playwright-cli snapshot                   # 取页面快照（带 ref）
playwright-cli close                      # 关闭浏览器

# 元素交互
playwright-cli click e15
playwright-cli fill e5 "user@example.com" --submit
playwright-cli select e9 "option-value"
playwright-cli check e12 / uncheck e12

# 键盘 / 鼠标
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli mousemove 150 300

# 截图与导出
playwright-cli screenshot --filename=page.png
playwright-cli pdf --filename=page.pdf
```

`--raw` 全局选项仅返回结果值，便于 pipe 到 jq/diff；`--json` 把每条回复包成 JSON。
locator 可写 `"#main > button"`、`"getByRole('button', { name: 'Submit' })"`、`"getByTestId('submit-button')"`。

## Running custom code (page.evaluate)

需要执行 CLI 子命令未覆盖的 Playwright API 时，用 `run-code`：

```bash
playwright-cli run-code "async page => { /* 任意 Playwright code */ }"
playwright-cli run-code --filename=./script.js
```

约束：必须是单个函数表达式；内部不支持 `import/export/require`；返回值会原样回写。

常用场景速查：

```bash
# 授权与定位
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 31.23, longitude: 121.47 });
}"

# 等待策略
playwright-cli run-code "async page => {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.appReady === true);
}"

# iframe / 下载 / 剪贴板
playwright-cli run-code "async page => {
  const frame = page.locator('iframe#my-iframe').contentFrame();
  await frame.locator('button').click();
}"
```

## Tracing

捕捉详细执行轨迹，调试失败步骤、性能或留存证据：

```bash
playwright-cli tracing-start
# … 一系列动作 …
playwright-cli tracing-stop
```

输出会写入 `traces/` 目录：
- `trace-{ts}.trace`：动作日志、DOM snapshot、截图、控制台与时间线
- `trace-{ts}.network`：完整请求/响应、headers、body、TTFB 等时序
- `resources/`：缓存的图片/字体/样式/脚本，用于重放

最佳实践：
- 在出问题之前就 start，覆盖完整流程
- 用 `find .playwright-cli/traces -mtime +7 -delete` 清理历史 trace 控制磁盘
- 录制本身有 IO 开销，不要长时间挂着

trace 适合调试 + 分析；video 适合演示与回放；screenshot 适合即时取证。

## Video recording

把会话录制成 WebM（VP8/VP9），用于复盘、文档或 hand-off 证据：

```bash
playwright-cli open
playwright-cli video-start recordings/login-flow.webm
playwright-cli video-chapter "Step 1" --description="Open homepage" --duration=2000
playwright-cli goto https://example.com
playwright-cli click e1
playwright-cli video-chapter "Step 2" --description="Fill form" --duration=2000
playwright-cli fill e2 "test input"
playwright-cli video-stop
```

需要细粒度叙事时，用 `run-code` 调用 `page.screencast.*` 一气呵成：

```js
async page => {
  await page.screencast.start({ path: 'video.webm', size: { width: 1280, height: 800 } });
  await page.screencast.showChapter('Adding Todo', { description: '展示新增', duration: 2000 });
  await page.getByRole('textbox', { name: 'What needs to be done?' })
    .pressSequentially('Walk the dog', { delay: 60 });
  await page.getByRole('textbox', { name: 'What needs to be done?' }).press('Enter');
  await page.screencast.stop();
}
```

`page.screencast.showOverlay(html, { duration? })` 可叠加自定义 HTML（`pointer-events: none`，不挡点击）；返回值含 `dispose()` 用于手动撤销。
录制带轻量开销；输出体积明显大于 trace，留意磁盘占用。
