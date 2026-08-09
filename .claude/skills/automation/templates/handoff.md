# Automation Verification Handoff

> 本文件描述 CLI 产物结构。代理不得手工填写它来替代真实 run 或 verify。

Result: **<VERIFIED | NOT VERIFIED>**

- Project: `<project-id>`
- Logical run: `<logical-run-id>`
- Executor: `<executor-id>`
- Execution: `<execution-id>`
- Attempt: `<NNN | unavailable>`
- Manifest case count: `<count>`
- Attempt path: `<canonical-path | unavailable>`

## Checks

- `<PASS | FAIL>` `<manifest | collection | preparation | status | allure | evidence | business-records>`: `<safe result>`

交付回复另外说明产品缺陷、实现错误、数据、权限、环境和未验证范围；不要向 handoff 添加无法由 CLI 验证的事实。
