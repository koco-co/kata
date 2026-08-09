<!-- 脱敏虚构示例，只展示格式；不是运行证据。 -->

# Automation Verification Handoff

Result: **NOT VERIFIED**

- Project: `example-project`
- Logical run: `20260809-1430-run-01`
- Executor: `playwright-web-ui`
- Execution: `execution-01`
- Attempt: `001`
- Manifest case count: `2`
- Attempt path: `artifacts/runs/example-project/20260809-1430-run-01/executions/playwright-web-ui/execution-01/attempts/001`

## Checks

- PASS `manifest`: 2 个 canonical case identity 有效
- PASS `collection`: 收集项与 manifest 精确一致
- PASS `preparation`: 环境与写入安全闸通过
- FAIL `status`: 1 个产品断言失败
- PASS `allure`: 2 个结果含 canonical labels
- PASS `evidence`: 两个 case 的受控证据完整
- PASS `business-records`: required case 的业务记录存在

交付结论：本次执行为 NOT VERIFIED；失败项按产品缺陷保留强断言和同一 attempt 证据，未自动重试或改弱断言。
