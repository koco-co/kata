# repair-loop

## 读取时机

进入 `repair-loop` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

只有 run-triage 分类为 `script` 或 `data` 的失败才进入 repair-loop。

### 第一步：按类型修复

修复骨架（locator 优先级 / `frameLocator` 穿透 / `networkidle` 禁用 / trace 与 console 诊断的具体 API how-to 见 `references/cli-essentials.md`，§6 不再复述）：

1. 按 §8 triage 分类（`script` / `data`），定位本次失败属于哪一类。
2. 指向 `references/cli-essentials.md` 对应小节读 how-to：
   - `script` 类（selector 找不到 / 等待超时 / 导航失败 / strict mode 多匹配）→ 看 locator 优先级、`frameLocator` 穿透、强等待替代 `networkidle` 等小节。
   - `data` 类（fixture 缺失 / 前置数据不满足 / feature flag 未开）→ 看 fixture 与 API 造数小节，并在 env profile 确认 toggle。
3. 读 `$RUN_PATH/playwright/.../trace.zip` 与注册的 `page.on('console')`/`page.on('requestfailed')` 证据，定位根因，再做最小改动，不盲改 locator。

### 第二步：每次修复的必须动作

每次修复（一个 spec 的一次修改）必须：

1. **修改前**：记录当前文件内容和失败证据
2. **修改**：只做最小改动（修改 selector / 调整等待 / 修正 fixture）
3. **重跑**：只运行目标 spec 文件（`playwright test automation/tests/runners/full.spec.ts`），**不带文件参数的全量重跑禁止**
4. **收集结果**：运行输出、退出码、通过/失败数
5. **记录修复证据**：
   - 修复前错误消息
   - 修改了什么（diff）
   - 修复后结果

### 第三步：修复次数限制

- 每个 spec 最多 3 次修复尝试
- 每个 locator 内部重试最多 2 次（使用 Playwright 内置重试，非手动 try/catch）
- 达到限制仍未通过 → 标记为 `repair_exhausted`，进入 handoff

### 第四步：自愈决策原则

修复前先确认 §8 triage 分类（来自 `UiRunTriage@1.classification`）：

- **`script` 类**（locator / 等待 / 时序）→ 纯技术修复：改 spec，**源用例（archive.md）不动**。
- **`product` 类**（功能、文案、业务规则变了）→ 属于用户可见变化：**不得在此硬改断言去迁就产品变化**。转至 handoff 阻塞，并触发 §12 case-feedback（`ui_text_drift` / `business_rule` 等类型），由用户确认后再改用例。把产品变化当技术问题硬改断言，即虚假通过，违反步骤与断言真实性规则。
- **archive 写错（spec-error）类**：当脚本被迫偏离 archive（比较符 / 预期值 / metric 口径 / 数据语义与真实平台不符），或产品/后端缺陷须在 archive 标注（错误码、字典序误判等）→ 该偏差不得只钉在 `.ts` 头注释里；须按真实运行证据（env 截图 / source-repo 枚举 / 实例 logInfo / 生成 SQL / 后端错误码）记成 §12 的 `business_rule` correction 候选，由 §12 回写源用例。`script` 类纯技术修复仍不动 archive.md。

### 第五步：禁止

- **禁止**使用 `test.skip()` 或 `test.fixme()` 跳过失败
- **禁止**使用 try/catch 吞掉失败断言
- **禁止**使用 `?.[0] ?? []` 或 `if (x)` 守卫替换失败断言
- **禁止**弱化断言强度（如将 `toBe` 改为 `toContain` 以绕过精确匹配）
- **禁止**在未读完整失败证据前直接修改代码
- **禁止**每次修复都全量运行 Playwright suite

### 第六步：输出

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

## 调试产物隔离（强制）

- repair-loop 期间创建的调试 spec 必须放在 `features/<version>/<feature-id>/automation/tests/.debug/probe-<timestamp>.spec.ts` 下。
- 绝不把 `t01-debug.spec.ts`、`*-repro.spec.ts` 或 `diag_*.ts` 放进 `automation/tests/cases/`。
- 运行期调试捕获（HAR / 截图 / trace）须用 `.debug/` 内的 `testInfo.outputPath()`。
- 修复成功后自动清理 `.debug/` 目录；修复失败就保留 `.debug/` 内容，供下一次 handoff 做阻塞分流。

检查项 `no_debug_in_cases` 强制这条命名约束。
