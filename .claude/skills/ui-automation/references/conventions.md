# 脚本规范

## 目录与命名

- `automation/tests/cases/<用例slug>.spec.ts`：每条用例一个文件，只含本条逻辑。
- `automation/tests/runners/{smoke,full}.spec.ts`：只做 import 与编排，不写业务逻辑。smoke 选主流程几条，full 收全部。
- `automation/tests/pages/`：页面对象，跨用例复用的页面操作封装。
- `automation/tests/fixtures/`、`automation/tests/sql/`：前置数据与运行时 SQL。
- 跨 feature 复用的页面对象 / helper 提升到 `workspace/<project>/_shared/{pages,helpers}/`，不复制。

## 选择器优先级

`getByRole`（role + name）> `getByLabel` / `getByPlaceholder` > `getByText` > `getByTestId` > CSS class。避免动态 hash class 与长链路 nth 选择。

## 断言

- 从强到弱选用：`toMatchAriaSnapshot`（关键节点即可，不必全量）> `toHaveText` / `toHaveValue` / `toBeChecked` > `toBeVisible`（最弱选择，少用）。
- 不稳定值（ID、时间戳）用正则。
- 断言对象是真实业务结果：记录出现在列表、状态变为「成功」、数量正确——不是「页面没报错」。

## 等待

- 用 web-first 断言自动等待；`waitForLoadState("networkidle")` 只许出现在探测脚本，不进交付 spec。
- 禁止裸 `waitForTimeout` 当同步手段；确需轮询用 `expect.poll` 或 `toPass`。

## 环境与会话

- base URL、租户、项目名从注入的环境变量读，不硬编码；真实 Cookie 不进代码。
- 每个 spec 独立建 context；用例间不共享页面态。
- 测试记录名带可识别前缀与时间戳（如 `AUTO_20260725_xxx`），方便清理与核对。

## 证据

- 失败截图与 trace 进 run 目录；关键业务结果截图附进 Allure。
- console 错误与失败请求监听（`page.on("console"/"requestfailed")`）接入断言或日志。
