# Source Intake Protocol
## 读取时机
source-intake 阶段读取。用户给出 Lanhu、Axure、Markdown PRD、截图、fixture 或自然语言功能描述时，先把它们视为需求源输入。
## 输入
- Lanhu URL、Axure URL、本地 PRD、fixture、截图或用户描述。
- workspace 配置、可用抓取插件、历史 content_hash。
- Lanhu 抓取不需要本地 PRD，也不需要额外征求源抓取许可；Lanhu URL 本身即为源输入。
## 输出
- source_snapshot、source_refs、content_hashes、page_hierarchy。
- extracted_text、component_hints、interaction_hints。
- 抓取失败时的权限、Cookie、网络或 fixture 缺失说明。

## Lanhu/Axure source recovery order

当用户只提供 Lanhu/Axure URL 时，必须按以下顺序建立 source_snapshot；不得在第 1、2 步之前反问用户补截图、PRD 或项目名：

Lanhu/Axure source-intake 全程静默执行：除最终两行阻塞回复外，不得发送任何面向用户的 assistant text。这个规则覆盖通用技能宣告、进度说明、阶段总结、抓取摘要和落盘确认。需要继续抓取、切换 readable/html/markdown、补充精确计数或写入阻塞产物时，直接调用工具；不得先写“再尝试 readable 模式”“需要精确的搜索计数”“搜索计数完成”“进入阻塞草稿产物创建”等中间文本。抓取结果、搜索计数、项目/模块推断和 fallback 决策只允许进入内部推理或 artifact。

1. 解析 URL 参数（tid、pid、versionId、docId、docType、pageId），规范化异常空格后生成 source_ref。确认包中的原始 URL 必须逐字保留用户输入或规范化后的单一 URL；不得重复追加已存在的 query 参数（例如重复 `docType` 或 `pageId`）。参数表必须来自 URL parser 或等价结构化解析结果，不得手工拼接 URL。
   - URL parser 只能消费 URL 子串。若 URL 后同一条输入中还有普通文本，或紧随其后的用户回复回答了页面/功能名称，应将该文本作为用户已补充的功能/页面名称证据，不得拼接进 URL、抓取参数或搜索 token。
2. 用定向搜索查找同源缓存：先按完整 `pageId`，再按 `docId`，再按 `pid` 搜索 `workspace/*/features/*/{metadata.yaml,manifest.json,prd.md}` 与 `inputs/lanhu-snapshots/**`；若命中已有 feature，复用其 `prd.md`、`metadata.yaml`、`manifest.json` 与 `inputs/lanhu-snapshots/**` 作为 `lanhu.fixture@1` 证据，并将项目解析为该 feature 所属 `workspace/{project}`。这一步必须发生在任何外部抓取之前；不得在完整 URL token search 之前调用 `mcp__fetch__fetch_html`、`mcp__fetch__fetch_readable`、`mcp__fetch__fetch_markdown`、`WebFetch`、浏览器或设计源插件。错误顺序示例：Skill → Read `source-intake-protocol.md` → `mcp__fetch__fetch_html`。
3. 若未命中本地同源缓存，再尝试可用 Lanhu/设计源插件或浏览器抓取。抓取/能力检查必须串行执行：同一 assistant 消息或同一批 tool_use 中只能包含一个 fetch/WebFetch/MCP fetch/浏览器/设计源工具调用，必须等待该 tool_result 后再决定是否需要下一步；不得同时调用 `mcp__fetch__fetch_html` 与 `mcp__fetch__fetch_markdown`、readable/txt/WebFetch 或浏览器变体。若第一次抓取或能力检查返回 `requires approval`、`This command requires approval`、`was blocked`、`but you haven't granted it yet`、`Claude requested permissions to use WebFetch, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_html, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_markdown, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_readable, but you haven't granted it yet`、`Claude requested permissions to use mcp__fetch__fetch_txt, but you haven't granted it yet` 或等价权限拒绝，立即停止同一 URL 的全部 fetch/WebFetch/MCP fetch/浏览器/设计源变体尝试；不得等待授权、不得切换 readable/html/markdown/txt 或 WebFetch 重试。若已经能根据本地 token search 推断 `project`，把该一次拒绝作为当前运行的抓取 SourceRef observed_error 后进入 error-fallback-paths；若随后 Bash/Write/mkdir 也被拒绝，下一条 assistant text 必须是工具权限受限的两行固定文本。
4. 若仅命中同一 `pid/docId` 的相邻 feature 但 `pageId/versionId` 不一致，应将 project/module 作为 inferred 证据，不得当作当前页面事实。
5. 只有本地同源缓存和抓取均失败时，才输出 BlockedEnvelope/confirmation-package。面向用户的聊天回复只询问一个最能解除 blocking 的单项信息；截图、导出文件、模块归属等其他缺口只记录到确认包或 unresolved-summary，不得在同一条聊天回复中顺带索要。deferred material 只能命名缺失材料或待确认项，不得解释抓取机制或失败原因。登录态、Cookie、认证或权限不得作为缺口、deferred material 或抓取原因记录，除非本轮工具输出提供对应直接证据。若用户已经在同一条输入或紧随其后的回复中提供功能/页面名称，固定问题“这个 Lanhu 页面对应的功能/页面名称是什么？”已经解除，不得再次询问或写入 blocking/pending；若仍不能生成最终用例，只能询问下一项最小阻塞问题。

本地缓存命中时，必须继续进入 module-identify，不得因为 WebFetch 只能抓到 “蓝湖” 品牌页而停在 source-intake。

若未命中当前页面缓存但已能根据 `pid/docId` 推断项目，必须继续按 error-fallback-paths 写入阻塞草稿产物，而不是只在聊天中反问。

### 定向搜索边界

允许的本地缓存查找只能是带 URL 令牌的内容搜索，例如：

- `rg -n "<pageId|docId|pid>" workspace/*/features -g "prd.md" -g "metadata.yaml" -g "manifest.json"`
- `rg` 文件过滤必须使用 ripgrep 的 `-g` 参数；不得使用 GNU grep 风格的 `--include`。若命令包含 `--include`、shell 报错、或搜索结果与已知 token 缓存不一致，必须改用上面的 `-g` 形式重跑后才能记录 0 命中或请求项目消歧。
- 对 Lanhu/Axure URL 的首次 tool 序列，读取本文件后必须先执行完整 `pageId`、完整 `docId`、完整 `pid` 的定向 `rg` 搜索或等价 Grep 内容搜索；只有这些搜索完成且未命中当前页面同源缓存时，才允许调用 fetch/WebFetch/浏览器/设计源工具。若即将调用 `mcp__fetch__fetch_html`、`mcp__fetch__fetch_readable`、`mcp__fetch__fetch_markdown` 或 `WebFetch`，先检查本轮是否已经有完整 token search 证据；没有则必须改为搜索。
- 只有完整 `pageId` 命中同源缓存时，才允许读取该 feature 的 `prd.md` 正文、`inputs/lanhu-snapshots/` 文件名或具体截图，并作为 `lanhu.fixture@1` 证据。
- 若仅 `docId`/`pid` 命中但 `pageId/versionId` 不一致，这些命中只能作为相邻 feature 证据：只允许读取命中目录的 `metadata.yaml`，以及 token-search 输出中已显示的 `source_url` 行；禁止读取相邻 feature 的 `prd.md` 正文、截图文件名、`inputs/lanhu-snapshots/**` 或图片内容。
- 相邻 feature 的 `metadata.yaml` 只能来自上一步 URL 令牌搜索结果中解析出的精确 feature 目录；不得再用 Glob/ls/find 重新枚举候选目录。
- 若需要读取多个相邻 feature，必须先列出命中结果中的精确 feature_id/path，再逐个使用 Read 工具读取这些已命中的 `metadata.yaml` 文件路径；不得用 `ls`、`test -f`、Bash、cat、sed、head、for 循环或 shell 拼接对一个或多个 `metadata.yaml` 做存在性预检、批量读取或内容截断，也不得把 `ls .../metadata.yaml`、`test -f .../metadata.yaml` 或 `head -30 metadata.yaml` 输出当作模块推断证据。不得先执行 `ls -d workspace/<project>/features/<feature_id>`、`ls -d /.../workspace/<project>/features/<feature_id>` 或任何目录存在性检查。若直接读取某个 `metadata.yaml` 失败，只记录该精确读取失败，不得改用目录枚举补救。没有出现在 token-search 命中结果中的 feature 目录不得参与模块推断。
- 每个 URL token 搜索结果进入确认包时，必须保留搜索 token、搜索范围、命中数量和用于判断的样例路径；非 0 命中的 SourceRef 内容必须在同一行列出样例路径，命中数大于 5 时列前 5 个样例路径和总数，0 命中才可不列样例路径。不得只写“命中 dataAssets”“大量命中”“多个”、`Hits: 多个`、“4 命中”“22 命中”或“均为 prd.md”。确认包主证据中的 `pageId`、`docId`、`pid` 搜索 token、实际执行的 Bash/Grep/rg 搜索或计数命令参数以及记录的 `rg`/计数命令参数必须是 URL 参数完整值，不能写前缀、短码或截断值。不得执行 `rg "fc0fee93"`、`rg -c "fc0fee93"`、`rg "7de90493"`、`rg -c "7de90493"`、`rg "7afabbf5"` 等短码搜索；需要补充计数时直接执行完整值搜索，例如完整 docId `fc0fee93-74f5-4eff-a769-99e68506b296`、完整 pid `7de90493-e80f-4592-a263-38fb2d2e98c0`、完整 pageId `7afabbf5f0cf4d0680704ab3b5f20295`。确认包不得写“辅助探索”“辅助搜索”或任何前缀/短码搜索结果；完整 `pageId`、完整 `docId`、完整 `pid` 之外的搜索只能作为内部判断，不得落入确认包。
- URL token 搜索的确认包记录必须复用实际命令的搜索范围；若实际命令是 `rg ... workspace/*/features -g "prd.md" ...`，不得改写成 `workspace/*/features/{...}` 这类少一层 feature 通配的范围。命中数量必须通过工具输出或计数命令得到，不能靠估算；若工具输出被 `head` 截断或只是样例，必须补跑 `wc -l` 或写“总数未知，工具输出被截断，以下仅为已观察样例”，不得写“多个”。但若补充计数的 Bash/rg/count 命令返回 `requires approval`、`This command requires approval`、`This Bash command contains multiple operations`、`contains multiple operations` 或等价审批拒绝，必须立即停止同一 URL token 的全部 Bash/rg/count 重试；不得把 `rg ... | wc -l` 改写为无管道 `rg -c`、不得把 `workspace/*/features` 缩窄为 `workspace/{project}/features` 后重试、不得并发继续对 pageId/docId/pid 发起替代 Bash 计数。若已有 Grep/搜索输出足以精确计数，使用该输出；否则写“总数未知，工具输出被截断，以下仅为已观察样例”。
- `pageId`、`docId`、`pid` 搜索记录必须逐项对应本轮实际执行的命令输出；不得把未执行的搜索写成 0 命中，也不得把缩小文件范围后的 0 命中写成全范围 0 命中。若某次 `pid` 搜索只查了 `metadata.yaml`/`manifest.json` 而未查 `prd.md`，确认包必须写出该精确范围，且不得与先前 `prd.md` 命中证据矛盾。若需要证明 `pid` 在全范围无命中，必须按标准 `-g "prd.md" -g "metadata.yaml" -g "manifest.json"` 重跑。
- 插件/浏览器抓取能力判断必须来自当前运行时工具清单或实际调用结果。工具清单未包含 Lanhu 专用插件时，只能记录为“当前运行时工具清单未观察到 Lanhu 专用插件”，并引用该工具清单或能力检查 SourceRef；不得枚举未由工具清单输出直接证明的工具名称，也不得把记忆中的 MCP/插件列表写成 SourceRef。若本轮没有工具清单或能力检查输出，只能省略插件可用性结论，不能写“插件不可用”。
- 每次 fallback 判断都必须以当前运行内的抓取尝试为证据：不得因为历史经验或对页面技术形态的预设而跳过 WebFetch/设计源/浏览器尝试后仍写入抓取失败。若当前运行未实际调用某个抓取工具，确认包、unresolved-summary 与最终聊天只能写“未调用”，不得写该工具返回了什么。
- 若 WebFetch 只返回“蓝湖”品牌文字，或 HTML/markdown 抓取只返回 app 容器、脚本、样式或加载骨架，只能在 `observed_error` 记录“未提取到设计内容”“仅观察到品牌文字，未提取到设计内容”或“仅返回页面框架/静态资源引用，未提取到设计内容”。阻塞产物中的实际抓取 SourceRef 不得写 `observed_error: 无` 或空 observed_error；工具正常返回但未提取到可用设计内容时，用上述中性结果摘要作为 observed_error。`inferred_reason` 必须为空、`无` 或省略；不得在 confirmation-package.md、archive.draft.md、unresolved-summary.md、最终聊天或面向用户的中间 assistant 文本中写“SPA”“JS”“CSS/JS”“JavaScript”“客户端渲染”“运行时渲染”“无法渲染”“无法执行 JavaScript”“markdown 转换无法获取运行时渲染内容”等机制词，除非同一运行的工具输出直接说明该机制。不得在 observed_error、inferred_reason、blocking item、deferred material 中写登录态、Cookie、认证或权限，除非同一运行另有 SSO 重定向、登录页标题、认证 HTTP 状态、权限报错或截图可见文字。

禁止在 source-intake fallback 中使用以下 broad discovery：

- `Glob workspace/*/features/*/metadata.yaml`
- `Glob workspace/*/features/*/inputs/lanhu-snapshots/**`
- `Glob workspace/<project>/features/*/metadata.yaml`
- `Glob workspace/<project>/features/<date-or-prefix>*/inputs/lanhu-snapshots/**`
- `ls workspace/*/features/`、`ls workspace/*/features | head`、`ls /.../workspace/<project>/features/` 或任何相对/绝对路径下只为“确认目录结构”的 feature 目录列表命令
- `ls -d workspace/<project>/features/<feature_id>`、`ls -d /.../workspace/<project>/features/<feature_id>` 或多个精确相邻 feature 目录的 `ls -d` 存在性检查；token search 已给出精确路径时，下一步只能直接读取该路径下的 `metadata.yaml`
- `find workspace/*/features -maxdepth ...`、`find /.../workspace/<project>/features ...` 或无 URL 令牌的 `rg workspace/*/features`
- 因工具/插件不可用而扫描 `.claude/plugins/**`、`.agents/**` 或仓库全量目录；插件能力只能依据运行时已声明的可用工具判断。

若只命中同一 `pid/docId` 的相邻 feature，必须逐一读取命中目录的 `metadata.yaml` 后再推断模块；若相邻 feature 的 `modules` 不一致，模块结论必须标为 `ambiguous`，不得写成单一模块事实。
## 禁止
- 不得因输入是 Lanhu 或 Axure URL 而反向索要本地 PRD。
- 不得在未抓取或未读取 fixture 前进入需求原子化。
- 不得把抓取失败静默改写为产品事实；抓取失败的关键设计证据按 `references/error-fallback-paths.md`「证据底线」走 `ask_user` 索要，不得静默降级为推断最终档。
- 不得把抓取工具的通用解析失败改写为具体的前端技术形态、登录态、Cookie、权限或网络原因，除非有对应工具输出、页面标题、重定向、截图或 HTTP 证据。
- 不得把通用 WebFetch 对 Lanhu 返回的空壳页面视为最终抓取失败；必须先执行本地同源缓存查找与设计源插件/浏览器抓取尝试。

## Inputs directory contract

All ingested raw materials must land under `features/<featureId>/inputs/`:

- `inputs/prd-attachments/<original-filename>` — PRD docs, preserve original names
- `inputs/lanhu-snapshots/<page-name>.png` — Lanhu screenshots, named by **page**, not by numeric index
- `inputs/reference-docs/` — historical design docs, screenshots, etc

**Forbidden**: `images/`, `tmp/`, root-level `*.png` in the feature directory.

When taking lanhu snapshots, name by page semantic (`rule-task-list.png`), not `1-u1.png`.
