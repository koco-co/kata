# env-preflight

## 读取时机

进入 `env-preflight` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 目标

确认本轮 UI 自动化可使用的环境、登录态、项目权限与证据目录。env-preflight 只产出环境事实和 blocker，不生成测试脚本。

## 静默边界

从目标 discovery 开始到 env-preflight 结束前，除下列用户行动 blocker 外，不发送 assistant 可见进度文本：

- 环境确认 fallback。
- 登录态补充请求。
- 无权限 blocker。
- `blocked_by_environment: tool_permission_denied`。

目标目录、source-backed bootstrap、profile 读取、session mtime、真实 probe、run-id 与证据目录创建都属于内部进度。若需要记录，写入 run artifact，不写入聊天。

## 用户输入解析

处理任何 `/playwright-automation` 输入时，必须在目标 discovery 和环境判断之前先按行解析原始输入。

- 若最后一个非空行是 `确认`、`确认。`、`使用默认` 或 `默认`，该行是环境确认回复，不是功能标题。
- 这种确认直接等价于用户选择 `ltqc-local.yaml`。
- 立即设置 `env_profile=ltqc-local.yaml`、`env_confirmed=true`，直接读取该 profile 并进入 env-preflight。
- 不得再次调用环境确认 AskUserQuestion，不得再次输出环境确认 fallback。

若用户输入包含 `环境:`、`env:`、base_url 或完整 env profile 文件名，也视为环境已确认，直接读取对应 profile。

## 环境确认

用户未提供环境时：

1. 从目标 feature 路径推断 `project`。
2. 读取 `workspace/{project}/_shared/env/*.yaml`。
3. 若存在 `ltqc-local.yaml`，默认推荐它。
4. 使用 AskUserQuestion 一次性提供环境选项；问题必须包含连续纯文本 `默认推荐：ltqc-local.yaml`。
5. 选项 label 只写完整文件名，例如 `ltqc-local.yaml`；推荐说明放在 question 或 description。
6. 环境确认阶段不得索要 Cookie、storageState 路径或账号密码。

AskUserQuestion 不可用时，输出且只输出：

```text
请确认执行环境。
默认推荐：ltqc-local.yaml
可直接回复“确认”使用 ltqc-local.yaml，或回复以下环境文件名：
- ltqc-local.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-test.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-prod.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ci63.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
```

fallback 必须是本轮最后一个 assistant action。`session_status` 只能是文件存在/文件缺失，不得写 session 有效、可用、未过期。

## 工具拒绝哨兵

已确认 env profile 后，任何工具结果包含以下含义即终止 env-preflight：

- `requires approval`、`This command requires approval`、`The following parts require approval`。
- `was blocked`、`requested permissions`、`hasn't granted it yet`、`permission denied`、`未授权`。
- `Contains command_substitution`、`Contains simple_expansion`、`This Bash command contains multiple operations`、`Unhandled node type`。

下一次 assistant action 必须立刻是最终 text；首次拒绝后的下一次 assistant message 必须只包含一个 `type=text` content item，不得包含 thinking 或 tool_use。不得调用 TodoWrite、TaskStop、Read、Write、Bash、Glob、Grep、WebFetch、curl、Playwright probe，也不得用 `pwd`、`ls`、`date`、`mktemp`、`mkdir`、`echo "test"`、`openssl rand`、`uuidgen` 或替代 probe 继续试探。

最终 text 使用此结构，第一行必须严格等于 `blocked_by_environment: tool_permission_denied`，不得写成 slash/hyphen 变体；fenced code block 语言必须严格为 `shell`：

~~~text
blocked_by_environment: tool_permission_denied

有头模式 full test 人工验收命令：

```shell
KATA_DATAASSETS_ENV=<env_profile_file> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```
~~~

blocker 命令只使用拒绝前已经知道的 env profile 文件名、project 和 featureId。不得输出授权请求、手动绕行步骤或内部诊断。

## session 与登录态

session 文件存在或 mtime 超过 24 小时不能直接证明 session 有效或过期，只能触发真实 Playwright/API 复验。

- mtime 只能用独立简单命令读取：`stat -f "%m" <session_path>` 和单独 `date +%s`。
- 不得使用 command substitution、arithmetic expansion、管道、`&&`、`||` 或分号计算 age。
- 任一 mtime/run-id/evidence-dir 命令被工具拒绝时，按工具拒绝哨兵输出 `blocked_by_environment: tool_permission_denied`。

真实 probe 发现 `/login`、`/uic/#/login`、登录页正文或 `session_expired` 时，唯一可见文本必须直接从 `会话已过期。` 开始并立即停止：

```text
会话已过期。

已确认环境：{env_profile}
已检查 auth.session_path：{auth_session_path}（过期|缺失|无效）
已检查 repo-root fallback：{repo_root_fallback}（同一路径，过期|缺失|无效）

请提供当前登录态 Cookie 字符串，以便重新生成 storageState 后继续。
```

该模板不能只写在 thinking 中；输出模板前不得继续工具调用或删除 probe 证据。可交互模式若改用 AskUserQuestion，也必须先完成真实 probe 并只发一个登录态补充触点。

## 权限与环境分类

完成全部必要 probe 后再形成单一最终分类：

1. 登录跳转优先归类为 `session_expired` 或 `session_invalid`。
2. 已确认登录但 API 或页面返回 401/403/无权限时，归类为 `no_permission`。
3. 证据矛盾时，再做一个最小 probe；仍无法澄清则输出 `blocked_by_environment: auth_state_uncertain` 并列出冲突证据。

no_permission 只输出一次直接文本 blocker。不得把 tenant/project 名追加内部 ID 或括号编号；不得包装成“session 有效”。

## run-id 与证据目录

- run-id 使用内部选择的字面量，例如 `preflight-250515-01` 或 `preflight-01`；不得调用随机数、hash、管道或命令替换生成。
- 当前 feature 的证据目录必须使用 repo-root 相对路径：`workspace/{project}/features/{featureId}/results/<run-id>/playwright/preflight`。
- 不得把 `<REPO_ROOT>/...` 绝对路径交给 `mkdir -p`。
- run-id tool_result 返回且未拒绝后，才允许创建 evidence 目录；不得在同一 assistant message 中同时发起 run-id 和 evidence 目录创建。
- 若同一批 tool_result 中一个成功、一个包含拒绝信号，拒绝信号优先。

## 探测脚本

- 需要 repo 依赖的 Playwright/API 探测脚本写入当前 feature 的 `results/<run-id>/playwright/preflight/`，并从 repo root 执行。
- 轻量且不依赖 repo 的一次性脚本才可写入 `mktemp -d /tmp/kata-playwright-preflight-*` 返回的目录。
- 读取 repo-root 相对 `auth.session_path` 时，脚本使用 `path.resolve(process.cwd(), auth.session_path)`。
- 不得硬编码 repo root，不得用 `__dirname`、`import.meta.url` 或 `../../../` 反推 repo root。
- 截图、JSON、HAR 等 probe 证据写入同一 preflight 证据目录。
- 未作为结果证据保留的临时脚本必须清理，不能让 `git status --short` 出现根目录临时文件。

## 输出

写入 `UiAutomationPreflight@1`：

- `status`: `ready` 或 `blocked_by_environment`
- `env_name`, `base_url`, `tenant_name`, `project_name`
- `session_path`
- `evidence`: 截图路径、页面验证、API 验证
- `blocker_reason`

## 禁止

- 不得把需求文档、Archive MD 或截图描述当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 不得把 cookie、token、password 写入 YAML、用例、报告或聊天记录。
- 不得依赖临时 `/private/tmp` session 作为可交付运行入口。
- 不得在 repo root、project 根目录或 feature 根目录遗留 env-preflight 临时脚本。
- 不得用未保护 glob 检查可选配置；使用 `test -f`、`find <精确目录> -maxdepth 1 -name ...` 或 `rg --files -g ...`。
- 环境确认必须先于 source-backed PRD/截图读取；不得把环境 profile 列举和需求源读取并行执行。
