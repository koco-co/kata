# Error Fallback Paths
## 读取时机
source-intake、module-identify、historical-context、confirmation-package、case-draft、output、automation-handoff 任一阶段遇到可恢复失败时读取。
## 输入
- 当前 step id、失败原因、已收集 source_refs、artifact 状态。
- 用户 consent 状态、项目候选、blocking_pending 列表。
## 输出
- BlockedEnvelope、skipped notes、scoping notes、confirmation-package.md、archive.draft.md 或 unresolved-summary.md。
- 可继续执行的下一步和不可继续的证据原因。

## Lanhu/Axure 抓取失败降级门槛

Lanhu/Axure URL 抓取失败时，只有满足以下全部条件才允许向用户索要截图、PRD、Cookie 或项目名：

- 已按 URL 参数和页面标题检查 `workspace/*/features/*/{metadata.yaml,manifest.json,prd.md,inputs/lanhu-snapshots/**}`，没有找到可作为 `lanhu.fixture@1` 的同源缓存。
- 已检查可用设计源插件或浏览器抓取能力不可用，或其失败证据明确为权限/网络/认证问题。
- 已在输出中列明检查过的 workspace 候选、失败原因、下一步所需的最小补充材料。

若命中同源缓存，应将缓存作为 fixture 继续后续步骤；不得反问用户补截图或选择项目。

## Blocked source artifacts

当 Lanhu/Axure 当前页面无法抓取且无同源缓存，但能根据 `pid/docId` 或工作区证据推断 `project` 时，必须创建阻塞草稿产物：

- 从识别为 Lanhu/Axure URL 开始到最终回复，唯一允许的面向用户 assistant text 是最终两行模板。不得发送技能宣告、抓取进度、搜索进度、计数进度、推断摘要、fallback 摘要、目录创建说明或落盘确认；不得写“WebFetch 仅返回...”“再尝试 readable 模式”“需要精确的搜索计数”“让我补充计数”“搜索计数完成”“进入阻塞草稿产物创建”“Let me verify”“Let me verify some details”“update the confirmation-package”“现在补充样例”等中间文本。若需要继续工具调用，直接调用工具；若需要记录这些信息，只能写入 `confirmation-package.md` 或保留为内部推理。
- 两行模板只适用于尚未获得功能/页面名称的 Lanhu/Axure URL fallback。若同一条输入或紧随其后的用户回复已经提供功能/页面名称，必须把该回答记录为已解除的首要 blocking，不得再次输出固定问题“这个 Lanhu 页面对应的功能/页面名称是什么？”，不得把该固定问题写入 `confirmation-package.md`、`archive.draft.md` 或 `unresolved-summary.md` 的 pending/blocking；若仍需阻塞，只能询问下一项最小阻塞问题，并保持同样的静默与 artifact 约束。
- feature_id 使用 `YYYY-MM-unresolved-lanhu-<pageId前8位>`；若能从相邻 feature 推断模块，可追加模块短名，例如 `YYYY-MM-unresolved-dq-lanhu-<pageId前8位>`。必须保持单连字符 slug，符合 `FeatureManifest@2` 的 `feature_id` 正则；不得使用 `unresolved--...`。
- `<pageId前8位>` 必须来自结构化解析后的 `pageId` 字符串前 8 个字符，且必须在落盘目录、`manifest.json.feature_id`、`archive.draft.md`、`confirmation-package.md`、`unresolved-summary.md` 与最终聊天中完全一致。写最终聊天前只允许用已执行的 `mkdir -p workspace/{project}/features/{feature_id}/` 与成功的 Write tool_result 核对实际目录；不得为了核对目录再调用 `ls -d`、`ls`、Glob、find、Bash 或 Read。
- 最终聊天第一行的路径必须直接复制本轮已成功创建的目录字符串或 Write tool_result 的父目录字符串；不得凭记忆重新拼写、删减、压缩或重算。若 `pageId` 为 `7afabbf5f0cf4d0680704ab3b5f20295`，目录后缀必须是 `7afabbf5`；`7abbf5`、`7afbf5`、`7afabb5` 等任何删减或重排值都必须视为阻断性错误，禁止输出最终回复。
- 四个阻塞产物的每一次 Write file_path 都必须直接复用本轮 `mkdir -p` 成功创建的精确目录字符串作为父目录；不得重新手打、重算或从记忆拼接父目录。`confirmation-package.md`、`archive.draft.md`、`unresolved-summary.md`、`manifest.json` 的父目录必须完全一致，并与 `manifest.feature_id`、最终聊天路径一致。对于示例 `pageId=7afabbf5f0cf4d0680704ab3b5f20295`，禁止向 `workspace/dataAssets/features/2026-05-unresolved-lanhu-7abbf5/` 等任何变体目录写入任一文件。
- 如果模型在生成前自检发现路径曾被拼错或将要写入变体目录，必须停止写入并回到内部推理修正路径，仍不得发送任何面向用户的中间文本。不得在写错目录后发送 “I need to fix a critical error”、"Let me correct this"、纠错说明或落盘状态；不得调用 `rm -rf`、`mv`、`cp` 或二次 Write 自行清理/搬迁错误目录。
- 只有相邻 feature 的 `modules` 全部一致时，才允许把模块短名写入 feature_id 或正文结论；若相邻 feature 模块不一致，feature_id 不加模块短名，正文列出候选模块并标记 `module: ambiguous`。
- 产物路径固定在 `workspace/{project}/features/{feature_id}/`。
- 创建阻塞产物时不得为确认目录存在、查找格式样例或参考现有 feature 而执行 `ls workspace/{project}/features/`、`ls /.../workspace/{project}/features/`、`ls -d workspace/{project}/features/*/ | head`、`ls ... | head`、Glob、find 或任何相对/绝对路径下的父级 feature 目录枚举。只允许直接 `mkdir -p workspace/{project}/features/{feature_id}/`；mkdir 命令本身必须严格使用 repo-root 相对路径，不得使用 `<REPO_ROOT>/workspace/{project}/features/{feature_id}` 或任何绝对路径，即使该绝对路径位于允许工作目录内也禁止。若 thinking 中已构造 `<REPO_ROOT>/workspace/...`，必须在发起 Bash 前改成 `workspace/...`；不得调用 `mkdir -p <REPO_ROOT>/workspace/dataAssets/features/2026-05-unresolved-lanhu-7afabbf5`。不得在写完文件后再执行 `ls -d workspace/{project}/features/{feature_id}` 或绝对路径 `ls -d` 做存在性检查。若这一次 `mkdir -p` 返回 `was blocked`、`requires approval`、`This command requires approval`、`but you haven't granted it yet` 或提到 `allowed working directories`，下一条 assistant message 必须只包含一个 `type=text` content item，文本严格等于两行工具权限受限最终文本；不得包含 `type=thinking`，不得先产生新的 thinking 分析、错误解释、路径诊断或规则复述；不得重试相对/绝对 `mkdir -p`，不得尝试 Write 让目录自动创建，且不得出现 “The path IS within”“The error says it's within”“Wait, the error says”“Let me read the error more carefully”“try again with a different approach”“try using Write instead”“maybe writing a file will create the parent directories automatically” 等内部继续理由。
- Lanhu/Axure 阻塞草稿不得读取 `references/confirmation-package-template.md`、既有 workspace feature 产物或 few-shot/template 来决定格式；本节已经给出固定章节、最小 manifest 与最终聊天模板。常规 confirmation-package 阶段可读模板，但本 fallback 路径必须只依赖当前 SKILL.md、`references/source-intake-protocol.md`、本文件和本轮证据；若任一 reference Read 返回 `but you haven't granted it yet`、`requires approval` 或等价权限拒绝，不得再读取其他 `references/**`，不得写“maybe the user will grant permission this time”，必须用当前已加载的 SKILL.md 规则和本轮证据继续。
- 创建阻塞产物目录时只能创建 feature 根目录 `workspace/{project}/features/{feature_id}/`；不得创建 `workspace/{project}/features/{feature_id}/inputs`、`inputs/lanhu-snapshots`、`results` 或其他空子目录。阻塞草稿只允许写入 `confirmation-package.md`、`archive.draft.md`、`unresolved-summary.md`、`manifest.json` 四个文件。
- 若前序 source-intake 已通过 URL token search 得到相邻 feature 精确路径，创建阻塞产物或确认包前不得再执行 `ls -d` 检查这些相邻 feature 目录是否存在；只能逐个使用 Read 工具读取已命中的 `metadata.yaml`，或记录该精确读取失败。不得用 `ls`、`test -f`、Bash、cat、sed、head、for 循环或 shell 拼接对一个或多个相邻 `metadata.yaml` 做存在性预检、批量读取或内容截断，也不得把 `ls .../metadata.yaml`、`test -f .../metadata.yaml` 或 `head -30 metadata.yaml` 输出当作模块推断证据。
- 创建阻塞产物的 `manifest.json` 时必须使用本节给出的最小形态；不得为了格式参考读取任一既有 workspace feature 的 `manifest.json`、`metadata.yaml`、`archive.md` 或 `prd.md`。
- 必须写入 `confirmation-package.md`、`archive.draft.md`、`unresolved-summary.md`、`manifest.json`；不得产出最终 `archive.md` 或 `cases.xmind`。
- `confirmation-package.md` 必须列明：原始 URL、解析出的 URL 参数、已检查的精确搜索项、命中的相邻 feature、抓取失败原因、需要用户补充的最小材料。所有证据事实必须带 SourceRef ID（例如 `SR-LANHU-URL-001`、`SR-LOCAL-SEARCH-001`、`SR-ADJACENT-001`、`SR-FETCH-FAIL-001`），不得只写裸事实。
- `confirmation-package.md` 第一行必须严格等于 `## 原始 URL`；不得在其前添加 `# Confirmation Package`、标题、前言、空行或横线。章节标题必须使用中文规范标题：`## 原始 URL`、`## URL 参数`、`## SourceRefs`、`## 项目推断`、`## 模块推断`、`## 需要用户补充的信息`、`## 可选后续材料`。不得使用英文替代标题，例如 `## Source URL`、`## URL Parameters`、`## Deferred`。
- `confirmation-package.md` 的原始 URL 必须使用 fenced code block，代码块必须只包含一行 URL，且该行必须等于用户输入或规范化后的单一 URL；不得把 URL 写成 inline code，不得把 query 参数拆成多行、缩进参数、移除 `?`/`&`、改写 hash 路由或把参数重新排版。SourceRefs 中不得再次以内联代码重复完整 URL；`SR-LANHU-URL-001` 的内容只能写“见上方原始 URL”或等价短描述。
- `confirmation-package.md` 的原始 URL、参数表、搜索 token、artifact 目录与 `manifest.feature_id` 必须以首条用户输入 URL 的结构化解析结果为唯一真源；不得使用后续 WebFetch、`mcp__fetch__fetch_html`、readable 等工具调用参数或工具回显 URL 反向覆盖。若后续 tool_use URL 因模型重写出现 `pageId` 增删字符（例如把 `7afabbf5f0cf4d0680704ab3b5f20295` 写成 `7afabbf5f0cf4d06807004ab3b5f20295`），artifact 中必须继续使用用户输入的原始 `pageId=7afabbf5f0cf4d0680704ab3b5f20295`，不得记录变体。
- 已检查的精确搜索项必须写出搜索 token、搜索范围、命中数量和用于判断的样例路径；每个非 0 命中的搜索 SourceRef 必须在同一 SourceRef 内容中列出样例路径，命中数大于 5 时必须列出前 5 个样例路径和总数，0 命中才可不列样例路径。其中 `pageId`、`docId`、`pid` 的搜索 token、实际执行的 `rg`/计数命令参数与记录的 `rg`/计数命令参数都必须等于 URL 参数完整值，不得写成前缀、短码、首 8 位或省略号。不得执行或记录 `rg "fc0fee93"`、`rg -c "fc0fee93"`、`rg "7de90493"`、`rg -c "7de90493"`、`rg "7afabbf5"` 等短码命令。不得用“大量命中”“若干命中”等模糊数量替代可复核证据，不得只写“4 命中”“22 命中”“均为 prd.md”或只引用相邻 feature ID。若命中很多，只列出前 5 个样例和总数或说明总数来自工具输出截断。
- `confirmation-package.md` 的搜索 token 字段只能写 URL 参数完整值本身，不能写 `key=value` 形式、不能加参数名或说明；例如必须写 `7afabbf5f0cf4d0680704ab3b5f20295`、`fc0fee93-74f5-4eff-a769-99e68506b296`、`7de90493-e80f-4592-a263-38fb2d2e98c0`，不得写成 `pageId=7afabbf5f0cf4d0680704ab3b5f20295`，不得写成 `docId=fc0fee93-74f5-4eff-a769-99e68506b296`，不得写成 `pid=7de90493-e80f-4592-a263-38fb2d2e98c0`。
- Lanhu/Axure 阻塞草稿的 `confirmation-package.md` 不得创建“辅助探索”“辅助搜索”或等价章节，不得记录 `pageId` 前 8 位、docId 前缀、pid 前缀等短码搜索结果。即使本轮实际运行过前缀搜索，也只能在内部判断中使用；确认包主证据只保留完整 `pageId`、完整 `docId`、完整 `pid` 三类搜索项。
- 搜索范围必须与实际执行的命令一致，例如 `workspace/*/features/*/{prd.md,metadata.yaml,manifest.json}` 或等价 `rg ... workspace/*/features -g ...`；不得写成缺少 feature 通配层级的 `workspace/*/features/{...}`。命中数量必须与列出的样例数量一致；写入确认包前必须自检“命中 N 个”与列表条目数是否冲突。
- 若工具输出被截断或未计算总数，不得写“>20”“>5”“24+”“N+”“大量”“多个”等估计数量；不得写 `Hits: 多个`、`命中: 多个`、`总命中 >5` 或“多个，包含...”。必须先运行可复核计数命令（例如 `rg ... | wc -l`）或写明“总数未知，工具输出被截断，以下仅为已观察样例”。`pid` 搜索用于项目推断时同样适用；确认包中的 `pid` 命中数量不得出现阈值估计、加号估计或“多个”。但补充计数的 Bash/rg/count 命令一旦返回 `requires approval`、`This command requires approval`、`This Bash command contains multiple operations`、`contains multiple operations` 或等价审批拒绝，必须停止同一 URL token 的全部 Bash/rg/count 重试；不得把 `rg ... | wc -l` 改写为无管道 `rg -c`、不得把 `workspace/*/features` 缩窄为 `workspace/{project}/features` 后重试、不得并发继续对 pageId/docId/pid 发起替代 Bash 计数。若已有 Grep/搜索输出足以精确计数，使用该输出；否则写“总数未知，工具输出被截断，以下仅为已观察样例”。
- `confirmation-package.md`、`archive.draft.md`、`unresolved-summary.md` 与最终聊天中不得出现“大量命中”“若干命中”“多个命中”“多个”“N+”“>20”“>5”“24+”“总命中 >5”等模糊命中数量短语。即使命中结果很多，也必须写精确计数，或写“总数未知，工具输出被截断，以下仅为已观察样例”。
- 抓取失败记录必须区分 `observed_error` 与 `inferred_reason`：`observed_error` 只能写工具返回的错误、HTTP 状态、重定向目标、登录页标题、截图中可见文字，或工具正常返回但未提取到设计内容时的中性结果摘要；`inferred_reason` 必须为空、`无` 或省略，除非同一运行的工具错误直接说明原因。阻塞产物中的实际抓取 SourceRef 不得写 `observed_error: 无`、`observed_error: 无（...）` 或空 observed_error；若工具无报错但没有可用设计内容，observed_error 应直接写“仅返回页面框架/静态资源引用，未提取到设计内容”“仅观察到品牌文字，未提取到设计内容”或“无内容输出，未提取到设计内容”。若当前运行只有 `fetch_readable` 返回 `Failed to parse readable content from the page`，确认包、草稿、summary、最终聊天与任何面向用户的中间 assistant 文本只能记录该 exact observed_error；不得写“SPA”“JS”“CSS/JS”“JavaScript”“客户端渲染”“无法渲染”“无法执行 JavaScript”“运行时渲染”“markdown 转换无法获取运行时渲染内容”“需要登录态”“认证失败”或“Cookie”作为抓取结论，除非同一运行另有工具错误、浏览器、截图、HTTP 重定向证据直接说明。若 WebFetch 只返回“蓝湖”品牌文字，最多可记录“仅观察到品牌文字，未提取到设计内容”；不得据此写“需要登录认证”“session 过期”“Cookie 失效”。若 HTML/markdown 抓取只返回 app 容器、脚本、样式或加载骨架，最多可记录“仅返回页面框架/静态资源引用，未提取到设计内容”；不得追加 `CSS/JS`、`<div id="app">`、脚本文件名等原始片段括号说明；不得写“SPA”“JS”“JavaScript”“客户端渲染”“无法渲染”“无法执行 JavaScript”“需要登录态”“认证失败”“权限不足”“Cookie”或“session”。
- HTML/markdown/readable 抓取 SourceRef 只写工具名与 `observed_error`，必要时写 `inferred_reason: 无`；不得新增“输出”字段或把 HTML 结果展开为 `<div id="app">`、空容器、页面框架 HTML、脚本/样式引用、资源文件名、加载骨架源码片段等说明。中性摘要已经足够，任何原始 HTML 片段都不得进入 `confirmation-package.md`、`archive.draft.md` 或 `unresolved-summary.md`。
- `observed_error` 必须来自当前运行中的实际工具调用结果。若未调用 WebFetch、浏览器或设计源插件，不得写“WebFetch 返回空壳”“浏览器跳转登录页”“插件不可用”等结果性描述；只能写“当前运行未调用 <tool>，无 observed_error”，并且不得把它作为抓取失败证据。生成阻塞产物前必须至少有一个当前运行的抓取/能力检查 SourceRef。未调用工具不得在“抓取尝试”中单列小节。
- 最终聊天、`confirmation-package.md`、`archive.draft.md` 与 `unresolved-summary.md` 必须按工具分别表述抓取结果：WebFetch/readable 只能对应 WebFetch/readable 的实际输出，`mcp__fetch__fetch_html` 只能对应 `mcp__fetch__fetch_html` 的实际输出，`mcp__fetch__fetch_markdown` 只能对应 `mcp__fetch__fetch_markdown` 的实际输出。不得把未调用工具写进 blocking item、summary 或 observed_error；不得把 `fetch_html`、`fetch_markdown` 或 `fetch_readable` 的页面框架、静态资源引用或 app 容器等证据写成“WebFetch 返回/只能获取”的结果。除非本轮实际 tool_use 名称就是 `WebFetch`，artifact 与面向用户文本均不得出现 `WebFetch` 作为工具统称。
- HTML 抓取证据标题可写作 `fetch_html`，但必须同时标注本轮实际 tool_use 名称；不得使用 “WebFetch/html” 这类会把 HTML 抓取与 WebFetch/readable 混在一起的标题。
- 抓取 SourceRef 的工具名必须来自本轮实际 tool_use 名称。若本轮调用的是 `WebFetch`，工具名写 `WebFetch`；若本轮调用的是 `mcp__fetch__fetch_html`，工具名写 `mcp__fetch__fetch_html` 或明确标注“实际 tool_use: `mcp__fetch__fetch_html`”。不得写未调用过的 `fetch_markdown`、`fetch_readable`、`fetch_html`、浏览器抓取或设计源插件。
- Lanhu/Axure 阻塞草稿不得创建“运行时设计源插件”“插件能力”“浏览器能力”等章节，不得写“当前运行时工具清单未观察到 Lanhu 专用插件”“当前工具清单未观察到 Lanhu 专用插件”或任何插件可用性/不可用性结论。只有本轮实际调用了明确的能力检查工具并得到可引用 SourceRef 时，才允许在 SourceRef 汇总中记录该能力检查结果；系统提示中的工具列表、模型记忆、上下文摘要和人工观察都不算能力检查 SourceRef。
- `manifest.json` 必须严格符合 `FeatureManifest@2`，不得添加 schema 未声明字段。最小形态只允许：`schema: "FeatureManifest@2"`、`feature_id`、`case_drafting.status: "blocked"`、`case_drafting.archive_path: null`、`case_drafting.xmind_path: null`、`case_drafting.requirement_atoms: []`、`automation.status: "blocked"`、`automation.intents: []`、`automation.last_run_status: "not-run"`、`files.archive: null`、`files.xmind: null`、`files.tests_root: null`、`files.latest_results: null`。失败原因写入 `confirmation-package.md` 与 `unresolved-summary.md`，不得写入 manifest 额外字段。
- 若 Bash、Write、fetch、WebFetch 或 MCP fetch 返回 permission denied、permission_denied、用户未授权、Answer denied、非交互授权失败或等价权限拒绝，不得把权限拒绝包装成多段说明给用户，不得列出“已完成的分析”，不得请求“授权必要的工具权限”。权限拒绝触发词包括 `requires approval`、`This command requires approval`、`was blocked`、`but you haven't granted it yet`、`Claude requested permissions to use WebFetch, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_html, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_markdown, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_readable, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_txt, but you haven't granted it yet` 与 `Claude requested permissions to write to`。不得把 `haven't granted it yet` 当作可等待授权；在 `claude --print` 中它就是当前 action 的终止结果。
- 抓取/能力检查必须串行执行：同一 assistant 消息或同一批 tool_use 中只能包含一个 fetch/WebFetch/MCP fetch/浏览器/设计源工具调用，必须等待该 tool_result 后再决定是否需要下一步；不得并发或同批调用 `mcp__fetch__fetch_html` 与 `mcp__fetch__fetch_markdown`、`mcp__fetch__fetch_readable`、`mcp__fetch__fetch_txt`、`WebFetch` 或浏览器变体。抓取/能力检查首次遇到上述权限拒绝后，不得再次调用同一 URL 的任何 fetch、WebFetch、MCP fetch、浏览器或设计源变体；不得改试 `mcp__fetch__fetch_html`、`mcp__fetch__fetch_markdown`、`mcp__fetch__fetch_readable`、`mcp__fetch__fetch_txt` 或 `WebFetch`；不得再调用 Read 补读 `references/source-intake-protocol.md`、`references/error-fallback-paths.md` 或任何 `references/**`。这个禁止覆盖按需加载表和“进入 error-fallback-paths”的一般读取时机：即使本文件尚未读取、即使 Read 会被允许，也不得在抓取拒绝后读取 `references/error-fallback-paths.md`；不得写 “Let me read the error-fallback-paths.md reference”“go into the error-fallback paths”“Let me wait for them to be approved”“Let me try a different approach”“Let me try again”“one more time”“maybe the user will grant permission this time” 或 “the user may just need to see it again”。若本地搜索已经足以推断 `project`，可只把这一次权限拒绝作为抓取 SourceRef 的 `observed_error` 后立即进入阻塞产物 `mkdir -p workspace/{project}/features/{feature_id}/`；“立即进入”表示下一次工具调用必须是这条 `mkdir -p`，不得在其前补跑 `Grep` count、`rg` count、Bash count、读取相邻 `metadata.yaml`、模块推断、命中数精确化、SourceRef 样例扩充或任何 Read/Grep/Bash。不得在抓取拒绝后写 “Let me use Grep with count mode”“Let me read the metadata.yaml files”“I need to count the pid hits”“Now I have the counts”。不得为同一 URL 继续探索抓取能力。
- 如果 `mkdir -p`、目录存在性检查、Bash 或 Write 在阻塞产物创建阶段首次遇到上述权限拒绝，下一条 assistant message 必须只包含一个 `type=text` content item，文本严格等于两行：第一行 `工具权限受限，未能写入阻塞草稿产物。`，第二行 `请在允许写入 workspace/{project}/ 后重新发送该 Lanhu 链接。`。该文本前后不得有标题、列表、项目/模块推断、搜索命中、抓取尝试或其他说明；不得包含 `type=thinking`，不得再调用 Bash/Write/Read/Grep/fetch/WebFetch/MCP fetch，不得因为错误文本提到 `allowed working directories`、路径看似位于仓库根目录下或“应该被允许”而继续诊断，不得重试绝对路径或相对路径 `mkdir -p`，不得执行 `test -d`，不得尝试 “Write directly” 或 “Write might create the directory automatically”，不得再次 Write `confirmation-package.md`，不得把权限拒绝后续包装成“再尝试”“等待授权”或“换一种方式”。
- 当功能/页面名称尚未由用户提供时，面向用户的最终聊天必须严格等于两行模板：第一行 `阻塞草稿产物路径：\`workspace/{project}/features/{feature_id}/\``，第二行 `这个 Lanhu 页面对应的功能/页面名称是什么？`。第一行只能把路径包在反引号中，不得在 `阻塞草稿产物路径：` 前添加反引号，不得把整行或标签包成 inline code。两行之间不得有空行；前后不得添加“已落盘”“目录已核对”“所有产物已写入”“所有阻塞草稿产物已写入”“现在输出最终回复”等状态说明、输出提示、检查摘要、分隔线、Markdown 横线、URL 参数、搜索命中、项目/模块推断、抓取尝试、插件状态、已产出文件清单或 deferred 材料。进入阻塞草稿创建后，除工具调用和文件写入外，不得发送面向用户的中间文本；所有抓取摘要、项目推断、计数、目录创建说明都写入 artifacts 或保留为内部推理。其余未知项写入 `confirmation-package.md`，不得在同一句问题、同一段回复或附加说明中顺带索要功能描述、用途描述、模块归属、feature 名称、截图、导出文件、登录态或 PRD；不得附加示例、括号说明或“例如...”。当功能/页面名称已由用户提供时，最终聊天不得包含该固定问题；若仍需阻塞，只输出 artifact 路径和下一项最小阻塞问题。
- `archive.draft.md` 的“下一步”章节标题必须严格写作 `## 下一步`。当功能/页面名称尚未由用户提供时，该章节只能写入同一个首要 blocking 问题，固定写作“这个 Lanhu 页面对应的功能/页面名称是什么？”。当功能/页面名称已由用户提供时，禁止写入该固定问题；若仍需阻塞，可写下一项最小阻塞问题。不得写成 `## Next`、`## Next Step`、`## Action` 或其他英文标题；不得写成“功能名称/用途描述”“页面用途”“功能名称或截图”“提供功能描述或 PRD”等多选式或斜杠变体下一步。`archive.draft.md` 的 Status 或正文也不得使用“页面用途”“用途描述”“需用户确认页面用途”等替代表述；如需写状态，只能写“blocked — 等待首要问题确认”或等价不含用途/描述变体的状态。`archive.draft.md` 不得设置“待确认”“Pending Confirmations”或等价 pending 章节；`archive.draft.md` 的标题也不得包含“待确认”，不得写 `# 草稿 — 待确认`、`# Archive Pending`、`# Draft — unresolved`、`# Draft - unresolved` 或等价标题。标题必须是中文或中英混合的业务草稿标题，不得只用英文 Draft/unresolved 表达阻塞状态。模块归属、截图、导出文件、PRD 等非首要缺口只允许写入 `confirmation-package.md` 或 `unresolved-summary.md` 的 deferred 区域，不得写入 archive.draft.md，除非该项被明确选为下一项最小阻塞问题。若写 module 字段，只能写 `ambiguous`，不得追加“候选: ...”、候选模块列表或模块归属说明。
- `confirmation-package.md` 可列出非首要的可选材料，但必须把它们放在“可选后续材料”或“deferred”下。只有功能/页面名称尚未由用户提供时，“需要用户补充的信息”章节才写固定问题“这个 Lanhu 页面对应的功能/页面名称是什么？”；用户已提供功能/页面名称时，该章节不得写该固定问题，可留空或写下一项最小阻塞问题。不得写“补充材料”“请提供”“请一并提供”或把截图、模块归属、功能描述等多个缺口包装成同一轮用户请求。deferred material 只能写材料名或待确认项，例如“截图或导出 PRD”“模块归属确认”；不得追加括号说明、当前推断、模块候选、辅助定位说明或失败机制解释。deferred material 中不得出现登录态、Cookie、认证、权限或 session，除非同一运行已有直接证据证明该材料确实需要。聊天最终回复不得复述这些可选材料，也不得用“截图/PRD 可以先不提供”“无需登录态”等否定式补充提及 deferred 材料，除非该材料被明确选为下一项最小阻塞问题。
- `unresolved-summary.md` 必须只包含两个二级章节：`## Blocking / Pending` 和 `## Deferred Items`，且文件第一行必须严格等于 `## Blocking / Pending`。不得添加 `# Unresolved Summary`、任何一级标题、空白前言、抓取摘要、搜索摘要、URL 参数、项目推断、模块推断、SourceRefs 或任何其他章节。只有功能/页面名称尚未由用户提供时，blocking/pending 区域才包含首要 blocking 问题“这个 Lanhu 页面对应的功能/页面名称是什么？”；不得给固定问题追加 `（pending）`、`(pending)`、状态标签、括号说明或其他后缀。用户已提供功能/页面名称时，该固定问题不得写入 blocking/pending；若仍需阻塞，可写下一项最小阻塞问题。模块归属、截图、导出文件、PRD 等非首要项只能放入 Deferred Items，不得作为 Pending Confirmations，除非该项被明确选为下一项最小阻塞问题。Deferred Items 只能写材料名或待确认项，不得解释抓取机制、失败原因、当前推断、模块候选或用途，不得追加括号说明。`unresolved-summary.md` 不得写 URL 参数汇总，不得出现 URL token 省略号、短码或 Unicode ellipsis，例如 `tid=24a1c6b2-…`、`pageId=7afabbf5…`、`7afabbf5...`；如需引用 URL，只能写完整原始 URL或只写 SourceRef ID。
- Lanhu/Axure 阻塞草稿路径中不得调用 TodoWrite 或等价 todo 工具；不得为阻塞产物创建、完成、核对或收尾写 todo。最终聊天输出阻塞草稿路径和当前首要问题后必须立即结束本轮；不得再调用 TodoWrite、Bash、Grep、Read 等工具，不得继续处理或回答与当前 Lanhu/Axure 输入无关的历史、潜在或残留请求。写完阻塞产物后，下一条 assistant 文本消息必须是阻塞草稿路径加当前首要问题；功能/页面名称尚未提供时才使用固定两行模板，已提供时不得使用该固定问题。不得先发送“所有阻塞草稿产物已写入”“输出最终回复”等落盘/输出提示。四个阻塞产物首次写入成功后，不得再调用 Bash/Grep/Read/Edit/Write 追加样例、补计数、二次修正或核对；这些证据必须在首次写入前准备好。若使用 `claude --print`，最终 `result` 必须等于当前阻塞回复，不得被落盘确认、输出提示、检查摘要或后续无关回复覆盖。

只有无法推断 `project` 时，才允许先问一个项目消歧问题；问题中必须说明已经检查的候选项目和证据。
## Slug fallback（非 Lanhu/Axure 路径）

PRD、Markdown、自然语言、设计稿（非 Lanhu/Axure URL）等所有非 Lanhu/Axure 路径在创建 `workspace/{project}/features/{feature_id}/` 目录时，`feature_id` 必须满足以下硬约束：

- `feature_id` 结构固定为 `YYYY-MM[-{customer}]-{module}-{slug}`；`{module}` 取 metadata.yaml `modules` 的英文简写（`dq`、`metadata`、`modeling`、`general`、`assets`、`standard`、`lineage`、`security`、`multimodal`、`lifecycle`）。
- `{slug}` 必须匹配正则 `^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$`：仅小写英文字母、数字与连字符，长度 2–32；整体目录名长度 ≤ 50 字符。
- `{slug}` 推荐由 ≤ 3 个英文关键词组成（例如 `rule-toggle`、`api-resource`）。若无法生成合规英文 slug（缺少术语词典 / 多模块串联描述 / 仅有中文输入 / 仅有拼音），必须降级为 `YYYY-MM[-{customer}]-unresolved-{module}-{8-hex}`，其中 `{8-hex}` 取自源输入 SHA-256 前 8 位。
- 禁止把用户原文（含中文、全角标点、空格、拼音串联、>32 字符的英文串联）直接作为 `{slug}` 写入 `mkdir -p`；禁止把中文描述、待评估说明、模块候选作为 feature 目录名或目录子层级。
- 用户原文、原始中文描述、被丢弃的拼音 slug 必须写入 `<feature_id>/metadata.yaml` 的 `notes:` 字段（结构：`notes.legacy_slug:`、`notes.description_zh:`），供后续审计追溯，不得只保留在 thinking 或聊天中。
- 若 `mkdir -p` 命令字符串包含任一非 ASCII 字符或全角标点，必须在调用前停下来重新生成合规 `feature_id`；不得带着违规字符调用 `mkdir`。

## 证据底线

当以下关键设计证据无法获取时，**不得据此推断产出最终 archive.md 或 cases.xmind**，必须通过 `ask_user` 一次性批量索要缺失材料：

- Lanhu 设计内容抓取失败（WebFetch/插件/浏览器均无法提取有效设计内容，且无同源本地缓存）
- 确认的源码仓库不可读（路径不存在、无权限、分支不可达）

`ask_user` 索要的材料清单必须包含以下选项，不得拆分到多轮提问：

- 「贴 Lanhu 设计内容/导出」
- 「提供 Lanhu cookie 或可读链接」
- 「上传设计截图」
- 「给可读源码路径/分支或把仓库 clone 到 `.kata/repos`」

索要材料时必须按以下顺序写，不得多轮分次追问：

1. 依输入类型选 1–2 项最精准的材料；例如 Lanhu URL 抓取失败只列出前三项，源码不可读只列第四项。
2. 陈述当前阻塞状态，指明只有拿到真实证据后才能解除阻塞。

只有拿到用户提供的真实证据（设计内容文本/截图/可读源码）后，才允许解除阻塞、产出最终 `archive.md` 与 `cases.xmind`。阻塞期间必须维持 blocking 草稿，落 `.process/archive.draft.md`。不得把阻塞状态的草稿改名为 `archive.md` 或 `cases.xmind`。

## 禁止
- 不得吞掉失败并继续产出最终 archive.md 或 cases.xmind。
- 不得要求 subagent 直接向用户提问。
- 不得把 blocked 或 deferred 自动化项交给后续自动化 skill。
