# env-preflight

## 读取时机

仅当当前 workflow step id 等于 `env-preflight` 时读取。不得批量读取 `references/**`。

## 协议

### 最高优先级：工具拒绝哨兵

已确认 env profile 后，env-preflight 中任何工具结果只要包含 `Unhandled node type`、`This command requires approval`、`This Bash command contains multiple operations`、`The following parts require approval`、`require approval`、`Contains simple_expansion`、`Contains command_substitution`、`was blocked`、`requires approval`、`requested permissions`、`hasn't granted it yet`、`permission denied` 或 `未授权`，下一次 assistant action 必须立刻是最终 text，且第一个字符必须是 `blocked_by_environment: tool_permission_denied` 的 `b`。最终 text 第一行必须严格等于 `blocked_by_environment: tool_permission_denied`；不得写成 `blocked_by_environment / tool_permission_denied`、`blocked_by_environment/tool_permission_denied`、`blocked_by_environment - tool_permission_denied` 或任何 slash/hyphen 变体。验收命令 fenced code block 语言必须严格为 `shell`，不得写成 `bash`，且 fenced block 中只能包含一行验收命令。进入真实 probe/run-id/evidence-dir 阶段后不得在同一 assistant message 中批量发起 `pwd` 与 run-id/evidence 相关 Bash；也不得在同一 assistant message 中同时发起 run-id generation 与 evidence directory creation，必须先等待 run-id tool_result，确认未拒绝后才能创建 evidence 目录。若同一批 tool_result 中一个成功、另一个包含拒绝信号，拒绝信号优先，下一次 action 仍必须是最终 text，不得利用成功的 `pwd` 或其他成功结果继续推进。首次拒绝后不得调用 TodoWrite、TaskStop、不得维护 todo 状态、不得写“Todos have been modified”、不得调用 `TaskStop` with `task_id: "placeholder"`、不得用 `echo "test"` 或任何 basic command availability probe 测试工具是否还能用；即使 thinking 已经写出“must immediately output the blocker”“No more tool calls”“Let me output the blocker”“I already violated”“I can't undo”“STOP NOW”“NO NO NO! I just violated the rule”“I just made another violation”，下一次 action 也不得是 TodoWrite、TaskStop、Bash、`pwd`、`echo "test"` 或任何 tool_use。首次拒绝后的下一次 assistant message 必须只包含一个 `type=text` content item；不得包含 `type=thinking` 或任何 tool_use。不得再运行 `date`、`mkdir`、`mktemp`、`pwd`、`ls`、`test -d`、`echo "test"`、`Write`、`Read`、`TaskStop` 或任何“换个命令/试一下/看一下是否可用”的工具调用；不得为了确认 `env_profile_file`、`project`、`featureId`、`profile.project`、验收命令变量或已读取 profile 事实重新 `Read` `workspace/*/_shared/env/*.yaml`、`manifest.json`、`metadata.yaml` 或任何 reference；必须只使用拒绝前已经知道的 env profile 文件名、project 和 featureId 组装 blocker。不得为了“Let me simplify”“simpler approach”“format it properly”“Get repo root pwd”“确认 repo root”“构造命令”“the path is under <REPO_ROOT>”“path IS under <REPO_ROOT>”“The directory IS under <REPO_ROOT>”“false positive”“allowed working directories”“check current working directory”“results directory exists”“确认测试文件”“feature 目录内容”“tests/runners/full.spec.ts 是否存在”“handoff 命令路径”调用 `pwd`、`ls`、`echo "preflight-$(date +%s | md5 | head -c 8)"`、`openssl rand`、`uuidgen`、`TaskStop` 或 `echo "test"`，不得调用 description 为 `Get repo root` 的 `pwd`，不得调用 description 为 `Test basic command availability` 的 `echo "test"`，不得运行 `ls workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/`，不得调用 description 为 `Check if feature directory contents reveal tests existence` 的 Bash；blocker 命令只使用已知的 env profile 文件名、project 和 featureId。不得在模板前写“根据硬规则”“mkdir 被工具策略拒绝”“`mkdir -p` 被工具策略阻止”“必须停止 env-preflight 阶段”等解释；不得把整个 blocker 包进一个 fenced code block。最终 text 只能是：

~~~text
blocked_by_environment: tool_permission_denied

有头模式 full test 人工验收命令：

```shell
KATA_DATAASSETS_ENV=<env_profile_file> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```
~~~

### 最高优先级：登录态补充输出模板

任何 Bash/Playwright/API 结果一旦出现登录页、登录跳转、`/login`、`/uic/#/login` 或 `session_expired`，后续第一条 assistant text 必须严格以 `会话已过期。` 开头并使用 Cookie 补充模板；不得在模板前插入“Session 已过期”“探测结果显示”“探测确认 session 已过期”“探测确认 session 过期”“探测确认登录跳转”“页面重定向”“按规则直接输出 Cookie 补充请求”“按规则输出 Cookie 补充请求”“按规则输出登录态补充请求”“输出登录态补充请求”等诊断句。若已通过 `确认` 接受默认环境，最终 blocker 文本的第一个字符仍必须就是模板首字 `会`；不得在同一条 text 前面拼接确认解析、目标命中、bootstrap、mtime 或探测过程。

env-preflight 阶段的 assistant 可见文本不得出现“已剥离尾部”“设置 `env_profile=ltqc-local.yaml`”“进入静默 bootstrap”“开始两段式名称片段发现”“标题精确命中”“PRD 标题：”“case_drafting.status == not-started”“缺少 `archive.md`/`test-point-checklist.md`”“`prd.md` 和 `inputs/lanhu-snapshots/` 均存在”“环境已确认为”“Session 文件存在但 mtime 34h > 24h”“Session file mtime ~36.7h > 24h”“需要真实 Playwright 复验”“需运行真实 Playwright 复验”“使用字面量 run-id”“探测结果显示”“探测结果”“探测确认 session 已过期”“探测确认 session 过期”“探测确认登录跳转”“探测确认 session 过期，页面跳转到登录页。按规则直接输出 Cookie 补充请求。”“session 已过期”“输出登录态补充请求”“按规则输出登录态补充请求”“按规则输出 Cookie”“按规则直接输出”“进入登录态补充触点”“准备请求 Cookie”“归类为 session_expired”“Probe confirms”“Outputting Cookie supplement request”。这些是内部推理，不是用户输出。若需要告知登录态阻塞，只输出登录态直接文本模板。

若用户输入是 `/playwright-automation` 加功能名称、标题片段或自然语言描述，并且已经显式提供 `环境:`、完整 env profile 文件名，或已通过 `确认` 接受默认环境，则 env-preflight 之前和 env-preflight 期间仍保持静默：不得输出“Using playwright-automation”“Using playwright-automation to process feature”“Starting with feature name fragment discovery”“Found 精确目标目录”“Based on the search results”“has an exact PRD title match”“Let me now read the target directory metadata”“Let me read the target directory”“已剥离尾部”“设置 `env_profile=ltqc-local.yaml`”“进入静默 bootstrap”“开始两段式名称片段发现”“目标目录已精确定位”“目标目录已精确定位：”“目标目录已定位到”“目标目录已定位：”“目标目录已确认：”“目标目录确认为”“标题精确命中”“PRD 标题：”“PRD 标题精确匹配”“PRD 标题精确命中”“用户附带的 `确认`”“case_drafting.status”“case_drafting.status == not-started”“缺少 `archive.md`/`test-point-checklist.md`”“现在读取 manifest”“现在读取 manifest 和 metadata”“`prd.md` 和 `inputs/lanhu-snapshots/` 均存在”“prd.md 和 inputs/lanhu-snapshots/”“进入 source_backed_bootstrap”“环境已确认为”“环境已显式指定”“环境已显式确认”“Environment confirmed as”“Wait — 按规则”“按规则我不得”“直接读取 env-preflight”“直接执行 env-preflight”“Checking session file status”“Session 文件存在但 mtime 34h > 24h”“Session 文件 mtime 超过 24 小时”“Session 文件存在但 mtime 超过 24 小时”“Session file exists but mtime”“需运行真实 Playwright 复验”“需要真实 Playwright 复验”“创建探测脚本”“Running real Playwright probe”“Checking source-backed bootstrap eligibility”“Entering source_backed_bootstrap”“Now reading env-preflight”“checking session file”“Session file exists”“Creating probe script”“探测确认登录跳转”“探测确认跳转登录页”“session 已过期”等阶段提示。完成真实探测后，如需阻塞用户，只输出一个最终 blocker；登录态过期 blocker 的首行必须严格为 `会话已过期。`。在 `claude --print --output-format stream-json` 中，该阻塞场景只能有一条 assistant `type=text`。最终 blocker 文本的第一个字符必须就是模板首字，不得在同一条 text 前面拼接诊断句。

session 文件 mtime 超过 24 小时只能触发真实 Playwright 复验，不能直接判定过期、不能直接进入登录态补充、不能请求 Cookie。只有 Playwright/API 探测实际出现 `/login`、`/uic/#/login`、登录页正文或明确 auth 失败时，才可输出登录态补充模板。

session mtime/age calculation 必须使用可单独执行的简单命令并在内部推理中比较结果：先用 `stat -f "%m" <session_path>` 或等价单命令读取 mtime epoch，再用独立的 `date +%s` 读取当前 epoch；不得把 `date` 和 `stat` 组合进 `echo $(( $(date +%s) - $(stat -f "%m" ... ) ))`，不得使用 `$()`、`$(( ))`、管道、`&&`、`||` 或分号来计算 age。若任何一步返回 `Contains command_substitution`、`This Bash command contains multiple operations` 或其他工具拒绝，按工具拒绝哨兵立即输出 `blocked_by_environment: tool_permission_denied`。

run-id generation 不得依赖 shell 随机数、hash、管道或命令替换。优先在内部推理中选择一个已知字面量 run-id（例如 `preflight-250515-01`、`preflight-01`），随后若需要让目录创建命令复用该值，只把该字面量嵌入相对路径；不得调用 `echo "preflight-$(date +%s | md5 | head -c 8)"`、`openssl rand`、`uuidgen`、`md5`、`md5sum`、`head` 或任何会触发 approval 的生成命令。若 run-id generation 返回 `This Bash command contains multiple operations`、`The following parts require approval`、`This command requires approval` 或其他拒绝，立即输出 tool_permission_denied blocker，不得换用 `openssl rand` 或 TaskStop。

创建当前 feature 证据目录的 Bash 命令必须使用 repo-root 相对路径，且命令必须形如 `mkdir -p workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/results/<run-id>/playwright/preflight`；不得使用 `<REPO_ROOT>/workspace/...` 绝对路径。若 thinking 中已经构造出 `<REPO_ROOT>/workspace/dataAssets/features/.../results/<run-id>/playwright/preflight`，必须在发起 Bash 前改成相对路径；不得把绝对路径交给 Bash 后再根据 blocked 结果诊断。证据目录创建被拒绝后，不得运行 `test -f .../.gitkeep`、`test -d`、`ls`、`pwd`、`.gitkeep` 检查、输出 `not_needed` 的探测命令或任何“看看目录是否已存在”的工具调用。

### 第一步：解析用户输入

用户输入的是一条短提示，格式通常为：

```
需求: {feature_path}
环境: {base_url}
租户: {tenant_name}
质量项目: {project_name}
离线项目: {project_name}
cookie: {cookie_string}
```

从中解析出：
- `feature_path`: `workspace/{project}/features/{feature_name}/`
- `base_url`: 环境入口 URL
- `tenant_name`: 租户名称（如 hadoop2）
- `project_name`: 质量/离线项目名称
- `cookie`: HTTP cookie 用于建立登录态

若用户输入包含 `环境:`、`env:`、base_url，或完整 env profile 文件名（如 `ltqc-local.yaml`、`ltqc-test.yaml`、`ltqc-prod.yaml`、`ci63.yaml`），该环境视为用户已确认；不得再调用环境确认 AskUserQuestion，不得输出环境确认 fallback。此时必须直接读取对应 profile，执行 env-preflight，并在登录态失效时进入登录态补充触点。

若前一轮环境确认 fallback 已提示 `默认推荐：ltqc-local.yaml`，且用户回复只有 `确认`、`确认。`、`使用默认`、`默认` 或同义短句，直接等价于用户选择 `ltqc-local.yaml`；不得再次调用环境确认 AskUserQuestion，不得再次输出环境确认 fallback。

同一条 `/playwright-automation` 输入中也可能包含用户的极简确认，例如：

```text
/playwright-automation 【内置规则丰富】合理性，单表，字段值的计算关系对比
确认
```

处理任何 `/playwright-automation` 输入时，必须在目标 discovery 和环境判断之前先按行解析原始输入：去掉首尾空白后，若最后一个非空行严格等于 `确认`、`确认。`、`使用默认` 或 `默认`，则该行是环境确认回复，不是功能标题的一部分。必须先从功能检索文本中剥离该行，立即设置 `env_profile=ltqc-local.yaml`、`env_confirmed=true`，并按 `ltqc-local.yaml` 已显式确认处理，直接读取该 profile 并进入 env-preflight。不得把该输入当作“未提供环境”的新请求，不得调用环境确认 AskUserQuestion，不得输出环境确认 fallback，也不得输出“已剥离尾部 `确认`，设置 `env_profile=ltqc-local.yaml`，进入静默 bootstrap”等解析说明。从识别该确认到最终 env-preflight blocker 之前不得发送任何 assistant `type=text`；若最终分类为登录态过期，唯一可见文本必须直接从 `会话已过期。` 开始。

若用户只给 `/playwright-automation` 短提示而未提供环境：

1. 先从匹配到的 feature 路径推断 `project`。
2. 读取 `workspace/{project}/_shared/env/*.yaml`。
3. 默认推荐 `ltqc-local.yaml`（若存在），提问文案必须明确写出连续纯文本精确短语“默认推荐：ltqc-local.yaml”，不得在该短语中插入 markdown、空格或强调符号，并说明可直接回复“确认”或环境文件名继续。`ltqc-local` 的 option label 必须严格等于 `ltqc-local.yaml`，不得写成 `ltqc-local.yaml（推荐）`、`ltqc-local.yaml (Recommended)` 或追加任何后缀；推荐说明只能放在 question 或 description。
4. 不得在同一个确认问题中索要 Cookie、storageState 路径或其他登录材料；环境确认和登录态补充必须拆成两个触点。
5. 环境确认问题的选项说明可包含 profile YAML 中已读取的 base_url、tenant、project 等事实；只有已从该 profile YAML 读取 `auth.session_path`，并对该原始路径做过 exact-path existence check（如 `test -f workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json`）并记录证据时，才可说明 session 文件存在或缺失。环境确认前不得把文件存在、mtime 或大小表述为 session “有效”“可用”“未过期”或等价状态；session 是否有效只能在用户确认 profile 后，通过真实 Playwright 打开页面且未跳转登录页来判定。不得根据 env 名自行推导或检查 `session-local.json`、`session-test.json`、`session-prod.json` 等非 profile 原文路径；未检查 profile 原文路径时不得写“已有 session 文件”或等价表述。若 profile 含 `derive_from_session: true`，且其声明的 `auth.session_path` 文件存在，环境 fallback 必须写“文件存在”；不得因为派生标记、env 名、缺少其他候选路径或未检查 fallback 路径而写“文件缺失”。
6. 从进入 env-preflight 到用户确认 profile 之前，不得发送面向用户的进度 assistant text；如果本轮来自没有显式环境的 `/playwright-automation <名称片段/标题>`，该静默要求从初始 discovery 开始生效，而不是等到读取本文件后才生效。该场景中，AskUserQuestion 工具失败前不得发送任何 `type=text` assistant 内容；AskUserQuestion 以 `Answer questions?` 失败后，唯一允许的 `type=text` assistant 内容就是最终 fallback。不要写“I need to invoke the `playwright-automation` skill first as required by the routing rules.”“目标目录已精确定位”“目标目录已定位”“目标目录已定位：”“目标目录已确定：”“目标目录已确认”“目标目录已定位。让我读取该目录的 manifest 和 metadata。”“已定位目标目录”“现在读取 manifest 和 metadata”“精确命中目标目录”“PRD 标题精确匹配”“PRD 搜索在...精确命中”“PRD 精确包含”“确认目标目录”“现在读取该目录”“状态分析”“case_drafting.status=”“case_drafting.status”“case_drafting.status == not-started”“`prd.md` 和 `inputs/lanhu-snapshots/` 都存在”“source_backed_bootstrap”“符合 source_backed_bootstrap 条件”“进入静默 bootstrap”“进入 source_backed_bootstrap 模式”“先读取 env-preflight”“先检查可用的环境 profile”“Now checking env profiles”“已读取 env-preflight”“现在检查 session”“session 文件状态”“检查各 profile 的 session 文件状态”“profile 已就绪”“现在发起环境确认”“找到 profile”“已找到 4 个环境 profile”“已读取 4 个环境 profile”“所有 4 个 profile 均存在”“已读取全部 profile”“所有 profile 均有 session 文件”“所有 session 文件均存在”“所有 4 个 session 文件均存在”“所有 4 个 session 文件均存在。现在发起环境确认。”等阶段提示。若即将输出任何进度文字，必须删除该文字，直接调用下一步工具或 AskUserQuestion。完成 session 文件 existence check 后，下一次 assistant action 必须是 AskUserQuestion tool_use；不得先发送“现在发起环境确认”或任何状态汇总 text。AskUserQuestion tool_use 必须一次性提供合法结构：顶层 `questions` 为非空数组，问题对象包含 `question`、`header`、`options`，且四个 option label 分别严格等于 `ltqc-local.yaml`、`ltqc-test.yaml`、`ltqc-prod.yaml`、`ci63.yaml`；不得调用空 `{}`、不得省略 `questions`、不得先发占位问题再补参。`InputValidationError` 不是非交互预期信号，出现即代表流程错误；只有结构合法的 AskUserQuestion 返回 `Answer questions?` 时，才视为非交互不可用。若结构合法的环境确认 AskUserQuestion 返回内容包含精确文本 `Answer questions?`，无论 tool_result 是否显式展示 `is_error=true`，都必须立即停止并输出固定环境确认 fallback；不得等待用户选择，不得推断问题已在可见 UI 中展示，不得写“以上已列出 4 个可用环境 profile”“上方选项”“请选择或回复环境文件名继续”等依赖不可见交互控件的一句替代提示。fallback 文本本身必须包含连续纯文本精确短语“默认推荐：ltqc-local.yaml”，并以完整文件名列出可回复选项。fallback 选项名必须保持 `ltqc-local.yaml`、`ltqc-test.yaml`、`ltqc-prod.yaml`、`ci63.yaml` 这类完整文件名，不得把 `（默认推荐）`、`（推荐）`、`(Recommended)` 或其他后缀写进选项名；推荐说明放在独立说明或描述字段。不得只写“从上方选择”“上述选项”“上方环境选择”“已发起环境确认”“等待您的选择”或引用不可见的交互控件；不得先写“AskUserQuestion 在非交互模式不可用”“非交互模式下 AskUserQuestion 不可用”“按规则输出环境确认文本”等元说明；不得把该失败当作用户确认，也不得继续读取 PRD、截图、ui-probe 或生成脚本；fallback 文本不得新增未验证的 session 状态。fallback 第一行必须严格等于 `请确认执行环境。`，其前不得有任何字、空行、标题或横线。fallback 第二行必须严格等于 `默认推荐：ltqc-local.yaml`；fallback 第三行必须严格等于 `可直接回复"确认"使用 ltqc-local.yaml，或回复以下环境文件名：`；第一、二、三行之间不得插入空白行。选项列表必须是四个带冒号和环境事实的列表项，不得退化为裸文件名列表；环境事实只能写 `{base_url} / {tenant} / {quality_project} / 文件存在|文件缺失`，不得给 tenant 或 quality_project 追加 ID、括号或编号（禁止 `pw_test(10481)`、`test_tenant(10473)`、`pw_test(92)` 这类格式）。非交互 fallback 场景下，stream-json 中唯一允许的 assistant text 就是该 fallback；该 fallback 必须是本轮最后一个 assistant action，不得在 AskUserQuestion 之后、fallback 之前或 fallback 之后继续 Read env-preflight、Read 其他 reference、TodoWrite、Bash、Grep、Glob、Write 或推进 env-preflight。禁止在环境确认 fallback 路径中调用 TodoWrite 或维护 todo 状态。不得额外输出“Session 状态”“请选择执行环境”等替代段落。
7. 若用户已经显式提供 env profile，仍然必须保持静默直到 env-preflight 完成并需要用户行动；不得输出“Based on the search results”“has an exact PRD title match”“Let me now read the target directory metadata”“已剥离尾部”“设置 `env_profile=ltqc-local.yaml`”“进入静默 bootstrap”“开始两段式名称片段发现”“目标目录已精确命中”“目标目录确认为”“标题精确命中”“PRD 标题：”“PRD 标题精确命中”“读取 manifest 和 metadata”“case_drafting.status”“case_drafting.status == not-started”“缺少 `archive.md`/`test-point-checklist.md`”“`prd.md` 和 `inputs/lanhu-snapshots/` 均存在”“prd.md 和 inputs/lanhu-snapshots 均存在”“进入 source_backed_bootstrap 模式”“进入 source_backed_bootstrap”“环境已确认为”“环境已显式确认”“环境已显式指定”“用户已显式指定”“Environment confirmed as”“直接读取 env-preflight”“直接执行 env-preflight”“Checking session file status”“Session 文件存在但 mtime 34h > 24h”“Session 文件 mtime 超过 24 小时”“Session 文件存在但已超过 24 小时”“Session file exists but mtime”“需运行真实 Playwright 复验”“需要真实 Playwright 复验”“Running real Playwright probe”“探测确认登录跳转”“session 已过期”等进度文字。session mtime 超过 24 小时只能作为内部触发真实复验的事实，不得作为 assistant text 暴露；真实复验前不得直接请求 Cookie。若真实复验后判定登录态过期，第一条且唯一一条可见 text 必须直接以 `会话已过期。` 开始，不得复述任何已确认环境、目标命中或探测过程。

8. 若已确认 env profile 后的 env-preflight 期间出现工具权限或工具策略拒绝（例如 session existence check、session mtime/age calculation、run-id generation、Bash、Write/curl/Playwright probe、临时脚本写入或证据目录创建返回 `permission denied`、`未授权`、`requires approval`、`require approval`、`The following parts require approval`、`hasn't granted it yet`、`requested permissions`、`was blocked`、`Contains command_substitution`、`Contains simple_expansion`、`simple_expansion`、`contains multiple operations`、`This Bash command contains multiple operations`、`Unhandled node type`、`需要批准` 或等价内容），第一次拒绝即为终止信号，必须立即停止本阶段；不得区分“交互模式/非交互模式”，不得把用户回复“确认”解释为允许继续请求工具权限，不得把 approval prompt、`hasn't granted it yet`、`was blocked`、`Contains command_substitution`、`Contains simple_expansion`、`Unhandled node type` 或 multiple operations approval 解释成“标准交互授权流程”“可换个命令继续试”“换个命令继续算 mtime”“换个命令生成 run ID”“换个命令生成更简单 run ID”“simple approach”“用户还没机会 approve”“不是 OS permission denied”“不是实际 denial”“false positive”“路径看似在 allowed working directories 内”或“先诊断目录结构”。不得在首次拒绝后继续调用 Bash、Read、Write、Edit、Glob、Grep、WebFetch、curl、TaskStop 或 Playwright probe；首次拒绝后的下一次 assistant action 必须是唯一最终 text；首次拒绝后的下一次 assistant message 必须只包含一个 `type=text` content item；不得包含 `type=thinking` 或任何 tool_use。即使 thinking 中已经决定“输出 blocker/stop/no more tool calls”“I already violated”“I can't undo”“STOP NOW”“NO NO NO! I just violated the rule”“I just made another violation”，下一次 action 也不得是 `pwd`、`ls`、run-id retry、placeholder command、TaskStop、Read reference、`Read workspace/dataAssets/_shared/env/ltqc-local.yaml`、`Read workspace/*/_shared/env/*.yaml`、`echo "test"` 或任何 tool_use；不得为了确认 `env_profile_file`、`project`、`featureId`、`profile.project` 或验收命令变量重新读取 env profile、manifest、metadata 或 reference；不得先输出一条解释 text 再继续 tool_use，不得再出现任何 tool_use。不得继续用 `stat -f "%Sm"`、`openssl rand`、`uuidgen`、`date`、`date +%s | md5 | head -c 8`、`FEATURE="workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare"; RUN_ID="preflight-$(date +%s | md5 | head -c 8)"; mkdir -p "$FEATURE/results/$RUN_ID/playwright/preflight"; echo "RUN_ID=$RUN_ID"; echo "DIR=$FEATURE/results/$RUN_ID/playwright/preflight"`、`echo $$ | md5sum 2>/dev/null || uuidgen 2>/dev/null | head -c 8 || date +%s | head -c 8`、md5、md5sum、head、`mkdir -p`、重复 mkdir、`mktemp -d`、`/tmp` 写脚本、curl、替代 probe、TaskStop、重复 Write、Edit 修正 probe 脚本等方式试探权限；不得继续运行 `pwd`、description 为 `Get repo root` 的 `pwd`、`echo "test"`、description 为 `Test basic command availability` 的 `echo "test"`、`ls`、`ls workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/`、`test -d`、`npm ls`、`ls node_modules/playwright`、`node_modules` 检查、`npx playwright --version`、输出 `playwright_available` 的依赖可用性探测、feature directory contents 检查、测试文件存在性检查、`tests/runners/full.spec.ts` 是否存在检查、handoff 命令路径检查、description 为 `Check if feature directory contents reveal tests existence` 的 Bash、results directory exists 检查、current working directory 检查、重新 Read env-preflight reference、替代目录检查或任何“诊断一下”的后续工具调用。不得把 `This command requires approval`、`This Bash command contains multiple operations` 或 `The following parts require approval` 解读为“用户会看到批准提示，等用户 approve 后继续”或“还不是 denial”；不得写或按“Let me try and see”“Let me proceed”“Let me just try something minimal to see what's allowed”“Let me verify the values”“Wait, I need to check what the project is”“Check if feature directory contents reveal tests existence”“the path IS under <REPO_ROOT>”“The directory IS under <REPO_ROOT>”“allowed working directory is `<REPO_ROOT>`”“allowed working directories”“path is under <REPO_ROOT>”“先检查当前 working directory”“Check current working directory”“先看看 results 是否存在”“Check if results directory exists”“The results directory doesn't exist”的思路继续调用 `pwd`、`ls`、重复 `mkdir -p` 或 `mktemp -d`。不得输出裸 `tool_permission_denied`、不得输出“探测脚本已写好”“证据目录创建权限不足，环境预检无法继续。”“Placeholder command”“Let me simplify the command”“Let me try using a single command approach”“simple approach”“用户还没机会 approve”“Let me check if there's a results subdirectory already”“So `ls` works”“根据硬规则”“第一次工具权限拒绝即为终止信号”“env-preflight 阶段工具策略阻止”“由于工具策略阻止”“正在等待必要的权限批准”“需要允许的操作”“请确认批准以上操作”“需要你批准”“请确认必需的写入权限后重试”“请先批准必要的写入权限后重试”“批准必要的写入权限”“手动完成环境校验”“手动完成探测脚本写入”“手动运行验证”“手动验收命令”“等待权限批准”“`mkdir -p` 被工具策略阻止”“必须停止 env-preflight 阶段”“blocked_by_environment / tool_permission_denied”“```bash”等诊断前言、授权请求、操作清单、半截 blocker、错误格式 blocker 或手动绕行建议。最终可见文本必须严格使用以下结构；第一个字符必须是 `b`，第一行必须严格等于 `blocked_by_environment: tool_permission_denied`，即使此前已经错误调用了 `pwd` 或 `echo "test"`，最终 text 仍不得加任何诊断前缀；不得写成 `blocked_by_environment / tool_permission_denied`、`blocked_by_environment/tool_permission_denied`、`blocked_by_environment - tool_permission_denied` 或任何 slash/hyphen 变体；验收命令 fenced code block 语言必须严格为 `shell`，不得写成 `bash`；不得在模板前增加“根据硬规则”“mktemp 返回 requires approval”“env-preflight 阶段工具策略阻止”“由于工具策略阻止”“请确认权限”“手动运行验证”“手动验收命令”或其他说明句：

~~~text
blocked_by_environment: tool_permission_denied

有头模式 full test 人工验收命令：

```shell
KATA_DATAASSETS_ENV=<env_profile_file> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```
~~~

最终可见文本不得宣称 E2E 完成、session 有效或登录态过期；命令中的 `KATA_DATAASSETS_ENV` 必须使用已确认的完整 env profile 文件名（例如 `ltqc-local.yaml`），不得使用裸 env 名（例如 `ltqc-local`）。

env-preflight 探测脚本首次 Write 时，session 路径必须基于当前 repo 工作目录和 profile 原文解析，例如 `path.resolve(process.cwd(), auth.session_path)`；不得硬编码 repo root，不得写 `const REPO_ROOT = '<REPO_ROOT>'`，不得用 `path.resolve(REPO_ROOT, ...)` 解析 session 或 evidence 目录。若 Write 本身被拒绝，直接按本条输出 `blocked_by_environment: tool_permission_denied`，不得再尝试替代脚本路径。

环境确认 AskUserQuestion 的 canonical input 形态如下；必须在第一次调用时直接传入同等结构，只替换 description 中的 profile 事实，不得先用 `{}` 试探工具：

```json
{
  "questions": [
    {
      "question": "请确认执行环境。\n默认推荐：ltqc-local.yaml\n可直接回复\"确认\"使用 ltqc-local.yaml，或回复以下环境文件名：",
      "header": "执行环境",
      "options": [
        { "label": "ltqc-local.yaml", "description": "{base_url} / {tenant} / {quality_project} / {session_status}" },
        { "label": "ltqc-test.yaml", "description": "{base_url} / {tenant} / {quality_project} / {session_status}" },
        { "label": "ltqc-prod.yaml", "description": "{base_url} / {tenant} / {quality_project} / {session_status}" },
        { "label": "ci63.yaml", "description": "{base_url} / {tenant} / {quality_project} / {session_status}" }
      ]
    }
  ]
}
```

非交互 fallback 必须使用以下结构（可替换每个选项的 profile 事实与文件存在/缺失状态，但不得删掉精确短语、不得插入空行、不得改写选项名、不得增加标题、横线、前言、粗体、反引号、“Session 状态”或“请选择执行环境”段落）：

```
请确认执行环境。
默认推荐：ltqc-local.yaml
可直接回复“确认”使用 ltqc-local.yaml，或回复以下环境文件名：
- ltqc-local.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-test.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ltqc-prod.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
- ci63.yaml: {base_url} / {tenant} / {quality_project} / {session_status}
```

### 第二步：检查现有环境 profile

检查 `workspace/{project}/_shared/env/*.yaml`：

1. 列出所有现有 profile
2. 按 `base_url` + `tenant_name` 匹配：
   - 若已存在匹配 profile → 使用该 profile，**不新建文件**
   - 若不存在 → 新建 profile，文件名为 `{env_name}.yaml`，env_name 自动推断（如 base_url IP 的后两段）
3. profile 的 `auth.session_path` 必须是 repo-root 相对路径或绝对路径；repo-root 相对路径优先采用 `workspace/{project}/.kata/auth/{project}/session-{env}.json`。

### 第三步：建立 session

1. 检查 `auth.session_path` 下的 storageState 文件是否存在
2. 若不存在或已过期（超 24 小时）：
   - 若 profile 中 `derive_from_session: true`，先检查 repo-root 相对 `workspace/{project}/.kata/auth/{project}/session-{env}.json` 是否存在；存在则使用并回写/校准 profile 的 `auth.session_path`
   - 只有 repo-root fallback 也不存在时，才进入登录态补充触点
   - session 文件存在且 mtime 超过 24 小时时，必须运行真实 Playwright/API 复验；mtime age 只能由 `stat -f "%m" <session_path>` 与独立 `date +%s` 两个简单命令的结果在内部推理中比较得出，不得用 command substitution、arithmetic expansion、管道或多操作 Bash 一次性计算；不得直接当作过期或请求 Cookie，也不得向用户输出 “Session 文件存在但已超过 24 小时，需要真实 Playwright 复验。”、“Session 文件 mtime 超过 24 小时，需要真实 Playwright 复验。” 或 “Session file exists but mtime ... Running real Playwright probe ...” 这类进度文本。
   - 登录态补充触点必须说明已确认的 env profile、已检查的 `auth.session_path` 和 repo-root fallback 路径；不得要求用户重新选择环境。若 `auth.session_path` 本身已经等于 repo-root fallback，也必须单独列出两行，例如 `已检查 auth.session_path: workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json（过期）` 和 `已检查 repo-root fallback: workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json（同一路径，过期）`，不得只写一个“session 路径”。
   - 使用用户提供的 cookie 生成 Playwright storageState
   - 写入 `workspace/{project}/.kata/auth/{project}/session-{env}.json`，并在 profile 中记录该 repo-root 相对路径
3. 若文件存在且未过期：
   - 尝试用该 session 打开页面
   - 若页面被重定向到登录页 → session 过期，重新用 cookie 生成
4. **禁止**将 cookie/token/password 写入 YAML、用例文件、报告
5. 登录态补充必须在“直接文本请求”和“AskUserQuestion”二选一，不得两者都做：
   - 在 env-preflight 的 Bash/Playwright/API 探测结果已经显示登录跳转、登录页或 `session_expired` 后，下一条 assistant `type=text` 必须直接是最终 Cookie 补充请求，且第一行严格为 `会话已过期。`；不得先发送任何过渡文本。若即将输出 `已剥离尾部`、`开始两段式名称片段发现`、`标题精确命中`、`环境已确认为`、`Session 文件存在但 mtime 34h > 24h`、`需运行真实 Playwright 复验`、`探测结果显示`、`探测结果确认 session 已过期`、`探测确认 session 已过期`、`探测确认 session 过期`、`探测确认跳转登录页`、`探测确认该 session 已过期，页面跳转到登录页。按规则直接输出 Cookie 补充请求。`、`探测确认 session 已过期，页面跳转到登录页。按规则直接输出 Cookie 补充请求。`、`探测确认 session 过期，页面跳转到登录页。按规则直接输出 Cookie 补充请求。`、`探测确认登录跳转`、`跳转到登录页`、`跳转至 /login`、`Session 已过期`、`登录态已过期`、`session 已过期`、`进入登录态补充触点`、`需要补充登录态`、`准备请求 Cookie`、`归类为 session_expired`、`按规则输出 Cookie 补充请求`、`按规则直接输出 Cookie 补充请求`、`按规则输出登录态补充请求`、`输出登录态补充请求` 等文字，必须删除这条过渡文本，把路径和 Cookie 请求合并进同一条最终文本。该阶段不得出现两条登录态 blocker text；最终 blocker 文本的第一个字符必须是 `会`，不得在同一条 text 前面拼接诊断句。
   - Cookie 补充模板必须作为 assistant `type=text` 可见输出发送，不能只写在 thinking 中，也不能让 `claude --print` 的最终 result 为空。确认登录跳转后、最终文本发送前，不得再调用 Bash/Read/Edit/Write/Glob/Grep 等工具，不得执行 `rm -rf` 清理 `results/**/preflight`，不得删除探测脚本、截图或 JSON 证据。
   - 登录态直接文本请求必须按此模板输出；模板前不得有任何字、空行、标题或横线，第一行之前不得写“Session 已过期，按规则直接输出 Cookie 补充请求”等元说明：
     ```
     会话已过期。

     已确认环境：{env_profile}
     已检查 auth.session_path：{auth_session_path}（过期）
     已检查 repo-root fallback：{repo_root_fallback}（同一路径，过期|缺失|过期）

     请提供当前登录态 Cookie 字符串，以便重新生成 storageState 后继续。
     ```
   - `claude --print`、非交互运行或 `/playwright-automation` workflow 中默认使用直接文本请求：形成 session 过期/无效最终分类后的下一次 assistant text 必须就是最终 Cookie 补充请求并立即停止，首行必须是 `会话已过期。`；不得先输出或在最终文本中包含“Session 已过期”“进入登录态补充触点”“归类为”“输出 Cookie 补充请求”“session_expired”等内部过程说明，不得调用登录态 AskUserQuestion。
   - 若明确处于可交互 UI 且选择使用 AskUserQuestion，形成 session 过期/无效最终分类后的下一次 assistant action 必须是 AskUserQuestion tool_use；问题正文必须承载已确认 env profile、已检查的 `auth.session_path` 和 repo-root fallback；调用前不得先输出任何同义 blocker 文本或登录态补充说明，例如“Session expired”“Session 已过期”“登录态过期”“需要补充登录态”“需要提供有效 Cookie”“已检查 session 路径”等。
   - 若 AskUserQuestion 在 `claude --print` 中返回 `Answer questions?`，只输出一次最终 Cookie 补充请求并停止；该最终文本不得包含 `AskUserQuestion`、`当前模式`、`工具不可用` 等工具元说明。
   - 若直接输出文本补充请求，应说明已确认 env profile、已检查的 `auth.session_path` 和 repo-root fallback，并立即停止；不得再调用 AskUserQuestion。
   - 使用 AskUserQuestion 时必须提供至少两个合法选项（例如“提供 Cookie 字符串”“稍后提供/无 Cookie/阻塞等待”），不得只给一个“提供 Cookie”选项导致工具参数校验失败。登录态补充默认只请求 Cookie 字符串或允许用户稍后处理，不得主动索要明文密码/登录凭据。

### 第三步补充：登录态与权限分类

用户确认 env profile 后，env-preflight 可以执行多个 Playwright/API 探测来判断登录态、权限与产品可达性，但必须先完成全部必要探测并形成单一最终分类，再输出任何面向用户的 blocker 文本；不得先输出“noPermission/无权限”再继续探测并改判为“session 过期”。

分类优先级：

1. 若任一确认性探测跳转到 `/login`、`/uic/#/login`，或页面正文明确是登录页（例如“欢迎登录”“UIC账号登录”），优先归类为 `blocked_by_environment: session_expired` 或 `session_invalid`，并进入登录态补充触点。
2. 只有在未跳转登录、已确认处于登录态的页面或 API 返回 401/403/无权限页时，才可归类为 `blocked_by_environment: no_permission`。
3. no_permission 必须只输出一次 no_permission 直接文本 blocker；不得先输出诊断段落，不得再调用权限阻塞 AskUserQuestion，不得在 AskUserQuestion 失败后输出第二个 blocker。no_permission 文本第一个字符必须直接是用户可行动 blocker 正文，不得以“探测确认已登录但无 dataAssets 产品权限”“探测结果显示”“归类为 no_permission”“no_permission:”或类似诊断开头。no_permission 文本不得追加 tenant/project ID、括号编号或把 session 状态包装为“session 有效”；tenant、质量项目只写 profile 中的名称，不得写 `pw_test（10481）`、`pw_test (92)`、`test_tenant(10473)`。可在同一条最终文本中说明“可切换有权限环境或提供有权限账号 Cookie 后继续”，不得生成多选交互。
4. 若不同探测结果相互矛盾，必须继续用一个最小探测澄清；仍不能澄清时输出 `blocked_by_environment: auth_state_uncertain`，列出冲突证据，不得给出确定的 noPermission 或 expired 结论。
5. 探测脚本可以输出 URL、标题、关键登录/权限标识和截图路径；不得把大段 HTML 或 `page.content()` 原文片段写入 assistant 可见输出。需要页面证据时优先用截图、URL、title、body 关键字布尔值或短文本摘要。

### 第四步：验证环境可达性

1. 使用 playwright-chromium 的 `browser.newPage({ storageState })` 打开 `base_url` 对应 dataAssets 页面
2. 验证没有被重定向到 `/login`
3. 验证页面标题或 body 包含产品标识
4. 验证侧边栏/项目选择器可见
5. 记录验证截图到 `results/<run-id>/playwright/preflight/`

#### 临时探测脚本约束

- env-preflight 中为验证 session、登录跳转或页面可达性而创建的一次性脚本，必须写入 `mktemp -d` 生成的 `/tmp/kata-playwright-preflight-*` 目录，或写入当前 feature 的 `results/<run-id>/playwright/preflight/` 作为保留证据；创建当前 feature 证据目录时必须从 repo root 使用相对路径 `workspace/{project}/features/{featureId}/results/<run-id>/playwright/preflight`，不得用 `<REPO_ROOT>/...` 绝对路径作为 `mkdir -p` 目标。不得在 repo root、`workspace/{project}/` 根目录、feature 根目录或 `.ai/core/**` 写入 `check-session.mjs`、`probe.mjs` 等临时脚本。截图、JSON、HAR 等探测证据必须写入同一个 preflight 证据目录，不得用相对路径把 `session-verify.png`、`session-probe.png` 等文件落到 repo root。
- 若探测脚本会 `import` / `require` `playwright`、`@playwright/test`、repo helper 或 workspace package，必须直接写入当前 feature 的 `results/<run-id>/playwright/preflight/` 或 `results/preflight/` 并从 repo root 执行；不得先写到 `/tmp` 试跑再因依赖解析失败改写到 results。
- 探测脚本读取 profile `auth.session_path` 时，若路径是 repo-root 相对路径（如 `workspace/{project}/.kata/auth/...`），必须在第一次 Write 中通过 `path.resolve(process.cwd(), auth.session_path)` 从 repo root 解析，并在运行命令中固定 `cwd` 为 repo root；不得用 `__dirname`、`import.meta.url` 或手写 `../../../` 从脚本所在 `results/**` 目录反推 repo root，不得先写错路径再用 Edit 试探修正，不得出现先写 `const __dirname = path.dirname(fileURLToPath(import.meta.url))` 再替换为 `process.cwd()` 的探测脚本修复。需要绝对路径时必须在写脚本前由 Bash `pwd` 或 Node `process.cwd()` 一次性计算并注入，禁止多次编辑同一 probe 脚本只为修正 storageState 路径层级。
- 只有不依赖本仓库 node_modules/workspace 的轻量 shell/Node 探测才可使用 `/tmp` 目录。若使用 `/tmp` 目录，必须先用 Bash 执行 `mktemp -d /tmp/kata-playwright-preflight-XXXXX` 并读取真实返回目录；随后 Write 的 `file_path` 必须是该真实目录下的文件。禁止先 `mkdir -p /tmp/kata-playwright-preflight-$$`，禁止 Write 到包含 `$$`、`$TMPDIR`、`${TMPDIR}`、`*` 等未展开 shell 变量/通配符/占位符的路径。
- 临时脚本若不作为 `results/<run-id>/playwright/preflight/` 证据交付，停止前必须删除；不得让 `git status --short` 出现 env-preflight 产生的未跟踪根目录文件。
- 临时 Playwright 脚本需要加载本仓库依赖时，优先写入当前 feature 的 `results/<run-id>/playwright/preflight/` 并从 repo root 执行；不得先运行 `/tmp` 脚本触发 `ERR_MODULE_NOT_FOUND`、`MODULE_NOT_FOUND` 或等价依赖解析失败，再把脚本改写到 repo root 或 results 目录。
- 检查可选配置或文件集合时，不得使用会被 zsh 提前展开并失败的未保护 glob（如 `ls workspace/{project}/playwright.config.*`）；改用 `test -f`、`find <精确目录> -maxdepth 1 -name 'playwright.config.*'`、`rg --files -g 'playwright.config.*' <精确目录>` 或对 glob 做失败可控处理。

### 第五步：验证项目可切换

1. 调用 `POST /dassets/v1/valid/project/getProjects` API 获取项目列表
2. 验证 `project_name`（质量项目）在列表中
3. 验证项目选择器下拉中可选中该质量项目
4. 记录项目 ID 以备后续使用

### 第六步：验证数据源可用

1. 检查 profile 中 `datasources` 下默认数据源
2. 验证 `precondition_type` 对应的数据源在 UI 数据源管理中存在
3. 验证 `batch` 中的数据库和 schema 可达

### 输出

写入 `UiAutomationPreflight@1` schema，包含：
- `status`: `ready` 或 `blocked_by_environment`
- `env_name`: 使用的 profile 名称
- `base_url`, `tenant_name`, `project_name`
- `session_path`: 使用的 storageState 路径
- `evidence`: 包含截图路径、页面验证结果、API 调用结果
- `blocker_reason`: 当 status=blocked_by_environment 时，指明具体哪个检查点失败

### dataAssets 前置条件计划

- 将 Archive MD 的通用前置条件规划为 worker-scoped auto fixture。
- 将差异前置条件规划为 case 内步骤或 beforeEach。
- 不使用 `test.beforeAll(async ({ page }) => { ... })`；需要浏览器上下文时通过 `browser.newPage({ storageState })` 创建页面。

## 禁止

- 不得把用户文字（需求文档、Archive MD）当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 自动化交付不得新写 `workspace/{project}/.env.local`；新增或校准环境时，应写入 `workspace/{project}/_shared/env/{env}.yaml`，并将 Playwright storageState 放入 repo-root 相对 `workspace/{project}/.kata/auth/{project}/session-{env}.json`。
- `env/*.yaml` 只允许保存非密钥环境事实；cookie、token、password、storageState JSON 不得写入 YAML 或用例文件。
- 不得依赖临时 `/private/tmp` session 作为可交付运行入口；临时文件只可用于一次性探测，最终命令必须能通过 profile 复现。
- 不得在 repo root 或 project 根目录遗留 env-preflight 临时脚本；一次性探测脚本必须使用 `mktemp -d` 创建的 `/tmp/kata-playwright-preflight-*` 目录或 `results/<run-id>/playwright/preflight/`，不得使用平铺的 `/tmp/kata-playwright-preflight-*.mjs` 文件，并按证据保留策略清理。
- 不得用未保护 glob 检查可选 Playwright 配置或文件集合，避免 zsh `no matches found` 把可选检查变成流程失败。
- 新建 env profile 前必须检查现有 `workspace/{project}/_shared/env/*.yaml`：若 base_url + tenant_name 完全匹配已有 profile（只 tenant_name 为空字符串或 auth 字段缺失的情况除外），不得新建 profile，应编辑现有 profile 的 `projects.quality.name` 等字段来适配当前任务。
- 环境确认阶段不得要求用户提供 Cookie 或 session 文件路径；只有确认 profile 后且所有已声明 session 路径都不可用时，才可单独请求登录态。
- 环境确认阶段必须完成在读取 source-backed PRD/截图之前；不得把环境 profile 列举和需求源读取并行执行。

## 输出要求

- 保留 SourceRef（每条证据注明来源：user_input / profile / existing_session / ui_probe / api_call）。
- 区分 case_claim、observed_ui、environment、run_artifact 与 product_knowledge。
