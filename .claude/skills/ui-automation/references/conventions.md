# 脚本规范

## 目录与命名

- `automation/tests/cases/c<四位序号>-<slug>.spec.ts`：每条已自动化用例一个文件；cases YAML 通过 `automation.spec_file` 指向它，文件名由 `kata automation lint` 校验。
- `automation/tests/runners/{generated,full,smoke,retry-failed}.spec.ts`：只做 import 与编排，不写业务逻辑。smoke 收主流程的几条用例，full 收全部用例。
- `automation/tests/{pages,flows,assertions,fixtures,sql}/`：分别放页面对象、业务流程、业务断言、前置数据/fixture 与运行时 SQL；单 feature 能力不得放入 `_shared`。
- `automation/scripts/` 禁止使用。探测、取数、排序、结果重查、清理、同步等一次性代码只可放未跟踪的 `runs/<run-id>/_tmp/`；可重复执行的业务实现必须归入 `automation/tests/{flows,assertions,fixtures,pages,sql}`。
- 跨 feature 复用至少两次的低层能力才提升到 `workspace/<project>/_shared/{pages,helpers,fixtures,runtime}/`，禁止复制和为单 feature 提前抽象。
- `automation/tests/cases/` 只允许真实业务实现；缺实现的用例必须保持 `unmapped`，不能生成自然语言占位脚本。

## 配置来源

- 公共默认值只读 `config/automation/playwright.yaml`，环境值只读 `config/env/<env>.yaml` 的 `automation` 节点。
- 运行时只允许通过通用 CLI 的重复 `--set path=value` 临时覆盖；不读取 `.env`，不保留历史兼容变量。
- `requirement_id` 从用例 YAML 的 `meta.requirement_id` 解析；运行时使用 `kata automation run <feature-path> --project <project> --env <env>` 选择唯一 feature。

## 选择器优先级

`getByRole`（role + name）> `getByLabel` / `getByPlaceholder` > `getByText` > `getByTestId` > CSS class。避免使用动态 hash class 和长链路的 nth 选择器。

## 断言

- 从强到弱选用：`toMatchAriaSnapshot`（关键节点即可，不必全量）> `toHaveText` / `toHaveValue` / `toBeChecked` > `toBeVisible`（最弱选择，少用）。
- 不稳定值（ID、时间戳）用正则匹配。
- 断言对象是真实业务结果：记录出现在列表中、状态变为「成功」、数量正确——而不是「页面没报错」。

## 等待

- 用 web-first 断言自动等待；`waitForLoadState("networkidle")` 只许出现在探测脚本中，不进交付 spec。
- 禁止把裸 `waitForTimeout` 当同步手段；确需轮询时用 `expect.poll` 或 `toPass`。
- 等待、环境硬编码、选择器质量与用例文件命名由 `kata automation lint <featureDir> --exit-code`（以及 `--shared`）自动校验；本规范只保留业务语义与判断依据。

## 环境与会话

- base URL、租户、项目名从注入的环境变量读取，不硬编码；真实 Cookie 不进代码。
- 每个 spec 独立创建 context；用例之间不共享页面状态。
- 测试记录名带可识别前缀与时间戳（如 `AUTO_20260725_xxx`），方便清理与核对。

## 证据

- 失败截图与 trace 存入 run 目录；关键业务结果的截图附进 Allure。
- console 错误与失败请求的监听（`page.on("console"/"requestfailed")`）要接入断言或日志。

## 桌面端（Electron）差异

- 每个 spec 独立 `electron.launch()` 并 `close()`，用例之间不共享应用进程与窗口状态（对应 Web 的独立 context 规则）。
- 窗口即 page；多窗口用 `electronApp.windows()` 枚举，不假设单窗口。
- 没有 cookie 注入与 base_url：登录走应用自身的 UI 流程，后端指向由应用启动参数或配置决定，在环境确认阶段先问清。
- 选择器、断言、等待、证据与测试记录前缀规则与 Web 完全一致。
