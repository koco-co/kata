# env-preflight

## 读取时机

进入 `env-preflight` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 目标

确认本轮 UI 自动化能用的环境、登录态、项目权限和证据目录。env-preflight 只产出环境事实和 blocker，不生成测试脚本。

## 静默边界

从目标 discovery 开始，到 env-preflight 结束之前，除了下面这几个等用户行动的 blocker，不发任何 assistant 可见的进度文本：

- 环境确认 fallback。
- 登录态补充请求。
- 无权限 blocker。
- `blocked_by_environment: tool_permission_denied`。

目标目录、source-backed bootstrap、profile 读取、session mtime、真实 probe、run-id 与证据目录创建，这些都算内部进度。需要记录就写进 run artifact，不要写进聊天。

## 用户输入解析

处理任何 `/playwright-automation` 输入时，必须先按行解析原始输入，再做目标 discovery 和环境判断。

- 若最后一个非空行是 `确认`、`确认。`、`使用默认` 或 `默认`，这一行是环境确认回复，不是功能标题。
- 这种确认直接等于用户选了 `ltqc-local.yaml`。
- 立刻设置 `env_profile=ltqc-local.yaml`、`env_confirmed=true`，直接读这个 profile 并进入 env-preflight。
- 不得再调用环境确认 AskUserQuestion，也不得再输出环境确认 fallback。

若用户输入里有 `环境:`、`env:`、base_url 或完整的 env profile 文件名，同样视为环境已确认，直接读对应 profile。

## 环境确认

用户没给环境时：

1. 从目标 feature 路径推断 `project`。
2. 读取 `workspace/{project}/_shared/env/*.yaml`。
3. 若有 `ltqc-local.yaml`，默认推荐它。
4. 用 AskUserQuestion 一次性给出环境选项；问题里必须有连续纯文本 `默认推荐：ltqc-local.yaml`。
5. 选项 label 只写完整文件名，例如 `ltqc-local.yaml`；推荐说明放进 question 或 description。
6. 环境确认阶段不得索要 Cookie、storageState 路径或账号密码。

AskUserQuestion 不可用时，只输出下面这段，别的都不输出：

```text
请确认执行环境。
默认推荐：ltqc-local.yaml
可直接回复“确认”使用 ltqc-local.yaml，或回复以下环境文件名：
- ltqc-local.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-test.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-prod.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ci63.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
```

fallback 必须是本轮最后一个 assistant action。`session_status` 只能写「文件存在」或「文件缺失」，不得写 session 有效、可用、未过期。

## 工具拒绝处理

确认 env profile 之后，只要工具结果含有下面任一含义，就立即终止 env-preflight：

- `requires approval`、`This command requires approval`、`The following parts require approval`。
- `was blocked`、`requested permissions`、`hasn't granted it yet`、`permission denied`、`未授权`。
- `Contains command_substitution`、`Contains simple_expansion`、`This Bash command contains multiple operations`、`Unhandled node type`。

首次拒绝后，下一条 assistant message 只能包含一个 `type=text` content item，不得含 thinking 或 tool_use，且必须立刻输出最终 text，不得做任何额外操作。

**禁止调用的工具**：TodoWrite、TaskStop、Read、Write、Bash、Glob、Grep、WebFetch、curl、Playwright probe。

**禁止使用的替代试探手段**：`pwd`、`ls`、`date`、`mktemp`、`mkdir`、`echo "test"`、`openssl rand`、`uuidgen`，或任何其他等价命令。

最终 text 按这个结构写，第一行必须严格等于 `blocked_by_environment: tool_permission_denied`，不得写成 slash 或 hyphen 变体；fenced code block 语言必须严格是 `shell`：

~~~text
blocked_by_environment: tool_permission_denied

有头模式 full test 人工验收命令：

```shell
KATA_DATAASSETS_ENV=<env_profile_file> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```
~~~

blocker 命令只能用拒绝前已经知道的 env profile 文件名、project 和 featureId。不得输出授权请求、手动绕行步骤或内部诊断。

## session 与登录态

session 文件在不在、mtime 超没超过 24 小时，都不能直接证明 session 有效或过期，只能触发真实的 Playwright/API 复验。

- mtime 只能用独立的简单命令读取：`stat -f "%m" <session_path>` 和单独的 `date +%s`。
- 不得用 command substitution、arithmetic expansion、管道、`&&`、`||` 或分号去算 age。
- mtime、run-id、evidence-dir 中任一命令被工具拒绝时，按「工具拒绝处理」输出 `blocked_by_environment: tool_permission_denied`。

真实 probe 发现 `/login`、`/uic/#/login`、登录页正文或 `session_expired` 时，唯一可见文本必须直接从 `会话已过期。` 开始，并立即停止：

```text
会话已过期。

已确认环境：{env_profile}
已检查 auth.session_path：{auth_session_path}（过期|缺失|无效）
已检查 repo-root fallback：{repo_root_fallback}（同一路径，过期|缺失|无效）

请提供当前登录态 Cookie 字符串，以便重新生成 storageState 后继续。
```

这个模板不能只写在 thinking 里；输出模板前不得再调用工具，也不得删除 probe 证据。可交互模式若改用 AskUserQuestion，也必须先完成真实 probe，再只发一个登录态补充触点。

## 权限与环境分类

做完全部必要 probe 后，再给出唯一的最终分类：

1. 登录跳转优先归类为 `session_expired` 或 `session_invalid`。
2. 已确认登录、但 API 或页面返回 401/403/无权限时，归类为 `no_permission`。
3. 证据互相矛盾时，再做一个最小 probe；还是说不清就输出 `blocked_by_environment: auth_state_uncertain`，并列出冲突证据。

no_permission 只输出一次直接文本 blocker。不得给 tenant/project 名后面追加内部 ID 或括号编号；不得包装成“session 有效”。

## run-id 与证据目录

- run-id 用内部指定的字面量，例如 `preflight-250515-01` 或 `preflight-01`；不得用随机数、hash、管道或命令替换来生成。
- 当前 feature 的证据目录必须用 repo-root 相对路径：`workspace/{project}/features/{version}/{featureId}/runs/<run-id>/playwright/preflight`。
- 不得把 `<REPO_ROOT>/...` 绝对路径交给 `mkdir -p`。
- 等 run-id 的 tool_result 返回且没被拒绝，才能创建 evidence 目录；不得在同一条 assistant message 里同时发起 run-id 和 evidence 目录创建。
- 同一批 tool_result 里一个成功、一个带拒绝信号时，拒绝信号优先。

## 探测脚本

- 依赖 repo 的 Playwright/API 探测脚本，写入当前 feature 的 `runs/<run-id>/playwright/preflight/`，并从 repo root 执行。
- 只有轻量、不依赖 repo 的一次性脚本，才能写入 `mktemp -d /tmp/kata-playwright-preflight-*` 返回的目录。
- 读取 repo-root 相对的 `auth.session_path` 时，脚本用 `path.resolve(process.cwd(), auth.session_path)`。
- 不得硬编码 repo root，不得用 `__dirname`、`import.meta.url` 或 `../../../` 反推 repo root。
- 截图、JSON、HAR 等 probe 证据写进同一个 preflight 证据目录。
- 没当作结果证据保留的临时脚本必须清理，不能让 `git status --short` 冒出根目录临时文件。

## 输出

写入 `UiAutomationPreflight@1`：

- `status`: `ready` 或 `blocked_by_environment`
- `env_name`, `base_url`, `tenant_name`, `project_name`
- `session_path`
- `evidence`: 截图路径、页面验证、API 验证
- `blocker_reason`

## 禁止

全局禁令见 SKILL.md「真实性质控」。本阶段另加：

- 不得把 cookie、token、password 写进 YAML、用例、报告或聊天记录。
- 不得拿临时的 `/private/tmp` session 当可交付的运行入口。
- 不得在 repo root、project 根目录或 feature 根目录留下 env-preflight 临时脚本。
- 不得用没加保护的 glob 检查可选配置；要用 `test -f`、`find <精确目录> -maxdepth 1 -name ...` 或 `rg --files -g ...`。
- 必须先确认环境，再读 source-backed 的 PRD/截图；不得把环境 profile 列举和需求源读取并行做。
