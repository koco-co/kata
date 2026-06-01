# 去黑话重写 · 现状基线快照（Phase 1）

> 动笔改任何字之前的干净基线，作为后续对照。基线时点 worktree HEAD = `1ef8bddb0`（含 spec+plan 提交）。

## GREEN 基线

worktree `/Users/poco/Projects/kata/.worktrees/dejargon` 内，改写前：

- `bun test`：**1321 pass / 1 skip / 0 fail**，3135 expect()，157 文件，约 84.29s。
- `bun run check:skills`：**exit 0** — runtime skill sync passed / runtime detach passed / skill structure check passed。

任何重写后，这两条必须仍全绿；merge 前再跑一次最终确认。

## description 基线（8 技能，逐字原文）

后续改 description 时与本节逐字对照：除审计 approve 的黑话替换外，触发词 / 路由关键词不得丢失。全部远低于 1536 字符上限（括号内为字符数）。含 A 类黑话「沉淀」的仅 infra-diagnose、knowledge-curate 两条。

- **case-draft (246)**：依 Lanhu/Axure 链接(lanhuapp.com，含 axure/产品设计 URL)、Markdown PRD、设计稿、截图、fixture 或功能描述等需求源，生成、扩写或复核 QA 测试用例，产出 archive.md + cases.xmind。只发一条 Lanhu/Axure 链接、零文字也直接触发。只在 Archive/XMind/CSV 间转换改用 case-edit；基于已有用例做自动化改用 playwright-automation。
- **case-edit (162)**：拿到既有用例产物文件(.xmind/.csv/archive.md)路径，编辑、同步、归档、标准化或在 Archive·XMind·CSV 间转换，语义不变是底线。依 PRD/需求源产新用例改用 case-draft；只给需求功能目录路径/目录名改用 playwright-automation。
- **case-hotfix (236)**：拿到 bug ID、ZenTao bug URL(zenpms.dtstack.cn/bug-view-NNN.html)、issue URL、缺陷描述或修复说明，产出聚焦修复路径、可直接执行的单条 hotfix 回归用例(archive.md)。只发 bug-view-NNN URL 或 bug ID、零文字也直接触发。要基于失败证据写通用 bug 报告改用 defect-analyze；依完整 PRD 产用例改用 case-draft。
- **defect-analyze (115)**：拿到异常堆栈/控制台报错/HTTP 失败、带合并冲突标记的文本，或代码 diff/分支对，做根因分诊、冲突解决或静态缺陷扫描。已登记的 ZenTao bug URL/ID 改用 case-hotfix。
- **infra-diagnose (149)**：出现数据源/数据库/服务器连通性报错(如 JDBC No route to host、连接超时或被拒)，SSH 登机只读排查并修复，并沉淀凭据与排查知识。纯前端运行时报错且无需登机改用 defect-analyze；只查改业务知识改用 knowledge-curate。 ← 含「沉淀」
- **knowledge-curate (199)**：查询、记录或维护项目业务知识、规则、术语、模块事实，或问「XX 是什么」(项目业务概念)，统一沉淀于 _shared/knowledge/。触发短语如「记一下这个规则」「XX 术语什么意思」「更新模块知识」。只问源码实现细节，或要写编用例、扫 diff、做 UI 自动化的改走对应 case-*/defect-analyze/playwright-automation。 ← 含「沉淀」
- **playwright-automation (214)**：把需求用例目录路径/目录名(features/【v...】)、MD 用例、PRD、Lanhu、Playwright 脚本或运行失败结果转成或修复并真实跑通 UI 自动化。只发一个需求功能目录路径或目录名、零文字也直接触发(目录→自动化，用例产物文件→case-edit)。只手动操作浏览器、只写非 UI 用例(改走 case-draft)、只做静态扫描(改走 defect-analyze)的不在此。
- **workspace-manage (175)**：回答 kata 能力/功能菜单/命令帮助类提问，或创建、初始化、自检、收尾、修复项目工作区。触发短语如「kata 能干嘛」「功能菜单」「初始化工作区」「自检/收尾工作区」。仅生成或编辑用例改走 case-*；维护业务知识改走 knowledge-curate；UI 自动化改走 playwright-automation。

## 硬规则基线（逐字原文）

去黑话改写后，每条「要求 / 禁止 / 触发条件」必须逐条等价；改动须经审计 approve。

### case-draft（SKILL.md `## 硬规则（不变量）`，10 条）

- 所有产物写入 `kata features resolve` 返回的 featureDir；自行拼接 feature 路径视为未完成——版本号/slug 由引擎决定，手拼会偏离唯一目录。
- 每个 requirement atom 带 evidence_kind、ambiguity_class、confidence 与 ≥1 个 source_ref。
- 事实通过 manifest.json#case_drafting.requirement_atoms 的 SourceRef ID 引用：轻量行写 `{id, source_ref}`，完整路径保留在 source_refs / case_id / requirement_atom_ids。
- 证据分层：archive.md / archive.draft.md / cases.xmind 正文只留人类可读用例内容；SourceRef 标识（SR-、csv::、SourceRef 串）只存结构化数据层——证据泄漏进正文会污染人类可读用例。
- 用例↔证据用 case_id 与 requirement_atom_ids 对账，不用单一字段组合做唯一键——单字段组合会撞键、对不准证据。
- blocking pending 非零时只出草稿与确认类产物（confirmation-package.md / archive.draft.md / unresolved-summary.md，error-fallback 下豁免并保留 URL token 表与 SourceRef ID）；清零后才生成 archive.md 与 cases.xmind——带未决项的正式产物等于把缺口当结论交付。
- history_inferred 仅作参考证据，新增行为以产品反馈为准；manifest.json#automation.intents[] 中 ready 的 AutomationIntent 移交 playwright-automation。
- 表单类用例：用户给出或要求参考源码、平台 DOM/YAML、环境配置、截图控件时，这些证据必须进入必读集。
- 表单类用例生成前先建「表单字段基线」，不写基线外的字段/选项/按钮——QA 要照文案逐字核对，多写即失真。
- 表单证据不可读时用 AskUserQuestion 一次性批量索要缺口（推荐项置顶并附理由）；不得凭历史/few-shot/模板补齐后产出最终 archive.md/cases.xmind——补造的字段没有证据支撑。

### playwright-automation（SKILL.md `## 硬规则（不变量）`，line 58-74）

- 执行管线 env-preflight → ui-probe → plan-reconcile → playwright-generate → self-run，前序通过才进下一阶段。
- 无 ui-probe 证据不生成最终脚本（静态审查除外）——没探过真实页面的脚本只是猜测。
- 无 self-run 结果不下成功结论——没跑过就说通过是假交付。
- 可见编排：env 确认且无 blocker 后，按 `references/execution-protocol.md` 建 TodoWrite 可见进度、派 Worker、二阶段 review。
- silent-mode、env-preflight 全阶段、所有 BLOCKED 模板路径下禁止可见编排（不派 Worker、不建 TodoWrite）。
- env-preflight 的权限拒绝、静默模式、session 探测、登录态补充、no_permission 与 tool_permission_denied 模板严格遵循 `phases/§2-env-preflight.md`（与本节等效，不重复）。
- 名称片段 discovery 先用关键词在 manifest.json/metadata.yaml/archive.md/prd.md 精确定位唯一目标目录，再读其状态文件；不枚举 features/ 候选目录。
- blocked_by_case_draft_required 仅当目标目录同时缺 case-draft 自动化基线（ready AutomationIntent、archive.md、test-point-checklist.md）且缺 prd.md 或 inputs/lanhu-snapshots/ 时触发 → 进 handoff，不再读需求源。
- 失败处理先归类后动作；每个 spec ≤ 3 次修复，locator 内部重试 ≤ 2 次。
- 失败断言必须反映真实问题，不用弱断言/try-catch/test.skip/宽泛条件掩盖——掩盖式断言会把红跑伪装成绿跑。
- 环境用 `workspace/<project>/_shared/env/*.yaml` profile；新建前先查是否已有匹配 base_url+tenant，不为交付新建 `.env.local`。
- 产出布局：smoke.spec.ts + full.spec.ts 落 tests/runners/，case 落 tests/cases/，共享页面对象/helper 落 `_shared/`。
- 交付以目标 full.spec.ts 全量通过为准，仅 smoke 通过不算完成。
- 覆盖忠实度：每条在范围用例的步骤必须实现为真实页面动作。
- 覆盖忠实度：每条 expected_visible_result 必须断言为真实业务结果并真跑通。
- 禁止用「导航+可见性断言」代替业务动作与预期，禁止把业务流程简化为 surface 契约测试——surface 测试证明不了业务结果正确。
- 无法忠实实现的用例走诚实阻塞/排除并写 handoff.excluded_cases（含 reason_category），不假通过。
