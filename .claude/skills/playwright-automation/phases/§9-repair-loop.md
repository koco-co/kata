# repair-loop

## 读取时机

进入 `repair-loop` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

只有 run-triage 分类为 `script` 或 `data` 的失败才进入 repair-loop。

### 第一步：按类型修复

#### script 类失败修复

1. **Selector 找不到**：
   - 在浏览器 DevTools 中确认元素实际位置
   - 检查 iframe/shadow DOM 是否需要穿透
   - 检查是否有动态 class 名（如 `ant-btn css-xxx` 中的 hash）
   - 优先使用 `getByRole`、`getByText`、`getByLabel` 而非 CSS selector
   - 必要时使用 `page.locator()` 配合 `:has-text()` 或 `nth=`
2. **等待超时**：
   - 检查是否有 loading spinner / skeleton 未消失
   - 添加 `waitForLoadState("networkidle")`
   - 使用 `toBeVisible({ timeout: 15000 })` 替代裸 `waitForSelector`
3. **页面导航失败**：
   - 检查是否有重定向链
   - 确认 storageState 未过期
   - 检查 URL 是否正确编码
4. **strict mode violation**：
   - locator 匹配了多个元素 → 缩小范围（加父级上下文或 nth 选择器）

#### data 类失败修复

1. **数据不满足前置条件**：
   - 检查 `tests/data/` 下的 fixture 文件
   - 确认数据表已有预期记录
   - 使用 API 创建测试数据（通过 `page.evaluate` 或独立 API 调用）
2. **feature flag 未开启**：
   - 检查项目配置中是否启用了对应 feature
   - 在 env profile 中确认 feature toggle 设置

### 第二步：每次修复的必须动作

每次修复（一个 spec 的一次修改）必须：

1. **修改前**：记录当前文件内容和失败证据
2. **修改**：只做最小改动（修改 selector / 调整等待 / 修正 fixture）
3. **重跑**：只运行目标 spec 文件（`playwright test tests/runners/full.spec.ts`），**不带文件参数的全量重跑禁止**
4. **收集结果**：运行输出、退出码、通过/失败数
5. **记录修复证据**：
   - 修复前错误消息
   - 修改了什么（diff）
   - 修复后结果

### 第三步：修复次数限制

- 每个 spec 最多 3 次修复尝试
- 每个 locator 内部重试最多 2 次（使用 Playwright 内置重试，非手动 try/catch）
- 达到限制仍未通过 → 标记为 `repair_exhausted`，进入 handoff

### 第四步：禁止

- **禁止**使用 `test.skip()` 或 `test.fixme()` 跳过失败
- **禁止**使用 try/catch 吞掉失败断言
- **禁止**使用 `?.[0] ?? []` 或 `if (x)` 守卫替换失败断言
- **禁止**降低断言强度（如将 `toBe` 改为 `toContain` 以绕过精确匹配）
- **禁止**在未读完整失败证据前直接修改代码
- **禁止**每次修复都全量运行 Playwright suite

### 第五步：输出

写入 `RepairAttemptLog@1` schema，包含：

```yaml
failed_spec: "tNN-*.ts"
classification: script / data
attempts:
  - attempt: 1
    before: "错误消息/截图"
    change: "修改 diff"
    after_status: passed / failed
    after_output: "重跑输出摘要"
  - attempt: 2
    ...
final_status: passed / repair_exhausted
remaining_failures: 
  - test_name: "..."
    reason: "修复耗尽说明"
```

## Debug artifact isolation (mandatory)

- Debug specs created during repair-loop must live under `features/<featureId>/.debug/probe-<timestamp>.spec.ts`.
- Never put `t01-debug.spec.ts`, `*-repro.spec.ts`, or `diag_*.ts` into `tests/cases/`.
- For runtime debug captures (HAR / screenshots / trace), use `testInfo.outputPath()` inside `.debug/`.
- On successful repair, the `.debug/` directory is automatically pruned. On failed repair, `.debug/` content is preserved for blocker triage in the next handoff.

Quality gate `no_debug_in_cases` enforces naming.
