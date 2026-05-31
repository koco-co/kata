# run-triage

## 读取时机

进入 `run-triage` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

### 第一步：收集失败证据

1. 读取 `full.spec.ts` 的运行输出（stdout + stderr），提取每个失败 test 的名称和错误消息
2. 读取 Playwright trace/截图（`results/<run-id>/playwright/` 下对应 spec 目录）；可视化 trace 查看：`npx playwright show-trace results/<run-id>/playwright/.../trace.zip`
3. 检查错误消息是否为：
   - TimeoutError（等待超时）
   - 断言失败（expect 返回值不匹配）
   - Locator 未找到（strict mode violation / no element found）
   - 页面跳转异常（unreachable / crashed / 重定向到 login）
   - 网络请求失败（API 返回非预期状态码）
   - JS 执行错误（page.evaluate 异常）

### 第二步：按分类表归类

每条失败必须归入且只能归入以下类别之一：

| 类别 | 识别信号 | 判断依据 | 处理方式 |
|------|----------|----------|----------|
| **script** | selector 找不到、等待超时、locator 表达式错误、页面结构变更导致旧的 locator 失效 | 错误消息含 `locator` / `selector` / `timeout` / `strict mode`；手动在浏览器 DevTools 中能确认元素存在但 selector 无法定位 | 修复 locator 或等待策略 |
| **product** | 功能缺失、页面文案不对、交互逻辑不一致、API 返回与预期不符 | 手动操作浏览器确认功能不存在或表现不同；Archive MD 描述的功能未实现 | 标记为 product blocker，出 handoff 报告 |
| **data** | 测试数据不满足前置条件、数据库无记录、返回空列表、feature flag 未开启 | 检查 `tests/data/` 下 fixture、确认数据表是否有记录、确认 feature toggle 状态 | 补充测试数据或 fixture |
| **permission** | 403/401 响应、页面无权限提示、项目选择器为空 | 检查 storageState 是否过期、检查用户角色是否匹配 | 刷新 session 或标记为 permission blocker |
| **environment** | 环境不可达、502/503、页面白屏、重定向到 login、API base URL 不对 | 直接访问 `base_url` 验证；检查 `env/*.yaml` 配置是否正确 | 标记为 env blocker |
| **unknown** | 无法通过上述信号判断、错误消息无堆栈、偶发且不可复现 | 尝试复现 >=2 次；若每次失败点不同 | 标记为 unknown，附带复现证据 |

### 第三步：排除弱失败

以下情况**不是**真实失败，不得进入 triage：

- 文件路径错误导致的加载失败（runner 中 import 路径错了）
- 浏览器未能正确启动（headless mode check）
- `test.skip` 导致的跳过（这是人为隐藏失败）
- try/catch 吞掉断言后的空 pass

### 第四步：输出

写入 `UiRunTriage@1` schema，包含：

```yaml
run:
  command: 实际运行的 playwright 命令
  exit_code: N
  passed: N
  failed: N
  skipped: N
failures:
  - test_name: "..."
    file: "tests/cases/tNN-*.ts"
    classification: script / product / data / permission / environment / unknown
    evidence:
      error_message: "原始错误消息"
      trace_path: "results/<run-id>/playwright/...trace.zip"
      screenshot_path: "results/<run-id>/playwright/...png"
    repair_attempts: 0
    notes: "分析说明"
classification_summary:
  script: N
  product: N
  data: N
  permission: N
  environment: N
  unknown: N
repair_eligible:
  - script 类别 → 进入 repair-loop
  - data 类别 → 进入 repair-loop（修复 fixture）
  - product / permission / environment / unknown → 不入 repair-loop，直接进入 handoff
```

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 不得将失败归因为 `test script error` 而不检查实际错误类型。
- 不得跳过 trace/截图检查直接归类。
- 不得将产品 bug 强行归为 script 错误以进入 repair-loop。
