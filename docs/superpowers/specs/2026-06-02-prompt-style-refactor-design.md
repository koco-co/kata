# 提示词清通化重构 · 设计稿

- 日期：2026-06-02
- 主题：把 kata 全项目中文提示词从「Codex 翻译腔/黑话」改写成「清通平实」的中文
- 风格基准：余光中《怎样改进英式中文》、思果《翻译研究》——好中文是「简洁、通畅」，不是辞藻华丽
- 状态：设计已与用户确认（清通平实 · Skill本体+规则+入口 · 结构自由行为保真 · 试点先行分批）

---

## 1. 背景与目标

kata 的提示词大量来自 Codex 自我迭代，未经人工校读即合入，积累了严重的「翻译腔 + 工程黑话 + 中英混搭 + 文白夹杂」。读起来别扭、跳转成本高，新读者要先在脑内翻译一遍才能理解。

目标：在**不改变任何行为**的前提下，把这些提示词改写得读起来顺、模型也更好解析——像清通的现代汉语，而不是英语直译。

「优雅」在指令型提示词里不靠华丽辞藻，而靠**干净、语序顺、有节奏、会留白**。这正是余光中/思果说的「清通」，也是本次的唯一文风基准。

## 2. 范围

### 2.1 In-scope（约 50 个唯一文件）

| 类别 | 文件 | 说明 |
| --- | --- | --- |
| Skill 提示词本体 | 8 个 `SKILL.md` + `references/` + `phases/` + `prompts/` | 模型实际加载执行的指令体，翻译腔重灾区 |
| 规则 | `.claude/rules/*.md`（8） | 被 `CLAUDE.md` 当契约引用，改写更谨慎 |
| 共享提示 | `.claude/prompt/_shared/*.md`（2） | 被多个 skill 共享 |
| 入口文档 | 根 `CLAUDE.md`、`INSTALL.md` | 最高引用契约 |

### 2.2 Out-of-scope

- `workspace-manage/templates/`、`defect-analyze/templates/`（`.hbs` 输出模板 + `GUIDE.md`）—— 模板与渲染产物，本次不动（`GUIDE.md` 是否纳入见 §9 开放项）。
- 代码、测试、脚本；`workspace/**` 业务产物；只读源仓库。

### 2.3 去重说明（实际唯一文件 < 58）

- **符号链接**：`.claude/skills/_shared/case-qa.md` → `.claude/prompt/_shared/case-qa.md`。只改 canonical 源一次。
- **同内容副本**：`case-format-sample.md` 与 `case-format-sample.xmind.md` 在 `case-draft/fewshots/` 和 `case-edit/references/fewshots/` 各一份、逐字相同。改写须同步，或先确认是否 symlink 去重（见 §9）。

### 2.4 文件分类统计（全语料勘察结果）

| 分类 | 数量 | 改写策略 |
| --- | --- | --- |
| `prose-instruction` 纯散文指令 | ~14 | 主战场，可大胆重构 + 清通改写 |
| `mixed` 散文+样例混合 | ~29 | 只改散文说明，样例/表格/代码块/schema 整块保真 |
| `structured-format-or-sample` 结构化格式/样例 | ~7 | 最小改，只碰散文导语，样例本体零改 |

## 3. 风格指南：清通平实

下面是《kata 中文提示词风格指南》的核心内容（阶段 0 落盘为 `docs/prompt-style-guide.md`）。病症清单经全语料审计扩充，分语言层、结构层、排版层、保真红线四组。每条均带真实语料实例。

### 3.1 语言层（词与句）

- **L1 生造术语/黑话名词 → 日常词**
  分诊→按类型分流 · 对账→核对 · 门禁→检查项 · 管线→流程 · 不变量→铁律 · 回指→指回 · 归因→判断原因 · 可见编排→公开进度
  例：`事实性结论回指 evidence_refs` → `凡是结论，都要能指回 evidence_refs`
- **L2 工程黑话动词 → 说人话的动词**（区别于 L1 名词）
  去重→去掉重复 · 反推映射→反向推出对应关系 · 归一→统一成 · 回写→写回 · 快照→存一份当时状态 · 落地→落实/写入 · 残留→留下的
- **L3 中英混搭 → 二分法**
  保留原文：功能标识符（工具名 `AskUserQuestion`/`TodoWrite`、字段名、文件名、`§phase` 名、CLI `kata *`、产物名、schema 名）。译成中文：可译普通词（fork→新开、Worker→执行子代理、review→评审、silent-mode→静默模式）。混合短语逐 token 切分（`dry-run summary 数据源`：前半契约保真、后半译中文）。
  例：`fork 一个 general-purpose 子代理执行扫描` → `新开一个 general-purpose 子代理来做扫描`
- **L4 翻译腔破折号因果 → 正面陈述 + 一短句说为什么**
  例：`无 self-run 结果不下成功结论——没跑过就说通过是假交付` → `没有跑过，就不能下「通过」结论。没跑就说通过，是假交付。`
- **L5 文白夹杂/酸腐凝练 → 主谓宾顺的白话**（凡…者、无…不…、否定后置）
  例：`凡无证据者一律不入文` → `没有证据的内容，一律不写进报告`
  例：`不带文件参数的全量重跑禁止` → `禁止用不带文件参数的全量重跑`
- **L6 抽象名词当主语 → 让人或具体物做主语**（余光中核心）
  例：`失败处理先归类后动作` → `遇到失败，先判断它属于哪一类，再决定怎么处理`
- **L7 断尾无主语结论句 → 补主语或并入前句**
  例：`命中即可大幅缩短排查。` → `命中后能大幅缩短排查时间。`
- **L8 冗余双语注脚 → 删括号英文**（此处英文非标识符，纯装饰）
  例：`检索（lookup）`、`记录（record）` → `检索`、`记录`
- **L9「静默 X」系黑话 → 按语境分别译**，不一刀切
  静默转发→不声张地转发 · 静默触发→自动触发 · 静默跳过→不吭声地略过义务（语义不同，分别处理）

### 3.2 结构层（句群与篇章）

- **S1 一句塞太多约束 → 一句一意；长条件拆「何时 → 怎么做」**
  （语料最毒句：§5-plan-reconcile 第 33 行把 6 个分支塞进一句，拆成「触发条件 + 触发动作」两块。）
- **S2 长枚举禁令堆句 → 改 bullet 列表**，标识符逐个保真
- **S3 括号塞清单/机制解释/例外 → 外提为 bullet 或独立「例外：…」句**
- **S4 符号拼接代替连词 → 散文里还原 和/或/则/就**（`步骤=单页面`、`A + B`、`X → Y`）；但样例与映射表里的符号是契约，不动
- **S5 同义反复/相邻重复 → 合并**
- **S6 同一文件内多处近义重复（DRY 缺失）→ 收敛为一处规范陈述再被指回**；每处标识符不丢
- **S7 同一概念多名并存 → 建术语对照表，全仓统一一遍**（Worker/执行子代理、对账/核对、lint/检查、subagent/Agent）

### 3.3 排版层

- **P1** 一段一意、主句在前；列表项控制在一两行能读完，过长就拆。
- **P2** 中英文之间留一个空格（盘古之白）—— 全仓高频机械项，统一规整。
- **P3** 全角中文标点；英文直引号 `"…"` → 全角 `「…」`；西式破折号标题分隔 `Title — Sub` 规整（注意标题里 skill 名/`§phase` 名是标识符）。
- **P4** 标题层本地化：英文小节标题（`Spec Reviewer Prompt`、`Hard-Rule Priority`、`Self-run command template`）译成中文；同一 skill 内章节标题语言保持一致。
- **P5** 章节骨架黑话标题：`## 硬规则（不变量）` 这类跨文件复制的标题，全组**统一**替换为同一中文标题（如 `## 必须遵守的规则`），避免文件间术语漂移。

### 3.4 保真红线 / 不可改清单（最高优先，凌驾于 3.1–3.3）

任何改写法则一旦与下列红线冲突，红线优先。

- **R1 行为/语义零丢失**：所有阈值数字（如 `≤3 次修复`、`≤2 次重试`、`15 项门禁`、`keywords 6 段`）、触发条件、路由/改走目标、顺序依赖必须存活。
- **R2 标识符原样**：字段名、文件名、`§phase` 名、工具名、CLI（`kata *`）、产物名、schema 名（`PlanReconciliation@1` 等）、状态值（`aligned`/`plan_adjusted`/`blocked`/`source_backed_bootstrap` 等）、枚举值（category/severity）。
- **R3 frontmatter**：11 字段白名单不变；`description` 的触发关键词与改走目标**一字不动**（触发信号，动它有路由风险）；`argument-hint`/`model`/`effort`/`allowed-tools` 等不动。
- **R4 格式契约不散文化**：type/emoji 映射表、命令索引、产物矩阵、phase 枚举（`preflight|worktree|…`）、15 项门禁表、`keywords` 6 段规范、SQL/DDL 样例、JSON/YAML schema 样例 —— 整块保真，只能碰其外的散文说明。**不得**按排版法则 P/「表格只用于真正对照」去拆这些表。
- **R5 反例字符串零改写**：约束里作为反例的字符串原样保留，不「规范化」。如 `case-qa.md` 的「不得把 sql 归一成 SQL」「不得把字段写成字段级」、占位反例文案「页面已存在数据」「已登录/具备权限」—— 一旦被自动规范化，断言含义就被改坏。
- **R6 被测关键字**：`case-qa.md` 顶部 HTML 注释（被 `shared-case-qa.test.ts` 存在性断言）、`project-workflow-rules.md` 的 KATA 通知模板字段名与 emoji 映射、`prompts/agent-*` 的 category/severity 枚举与 JSON 字段（被契约测试依赖）—— 散文里嵌着被测标识符，不动。
- **R7 代码块内注释默认不动**，除非用户授权且不改变示例语义。
- **R8 触发词-正文同词**：若某词同时是 `description` 触发词（`description` 因白名单不能改），正文保持同词，不可只改一边，否则触发线索与正文术语断裂。
- **R9 lint 行数上限不破**：`SKILL.md ≤300`、`references ≤260`、`phases ≤260`。`cli-essentials.md`（251/260）只能等行或减行改写。
- **R10 同源重复块同步**：`routing-guard.md` ↔ `CLAUDE.md` 路由节、`project-workflow-rules.md` ↔ `git-workflow.md` ↔ `CLAUDE.md`、`infra-diagnose/SKILL.md` ↔ `ssh-protocol.md`、各 fewshot 副本 —— 改一处必须同步改所有副本，语义与关键术语对齐，避免措辞分叉。
- **R11** 只读源仓库规则不变；不加装饰性契约标记（lint 禁止）；`§<数字>-<kebab>.md` 文件名不改（`PHASE_NAME_RE` 约束）。

## 4. 文件分类与处理策略

按 §2.4 三类分别处理：

- **`prose-instruction`（主战场）**：可大胆重构章节、合并冗余、重排顺序，全面套用 3.1–3.3。仍受 3.4 红线约束（标识符、触发词、阈值）。
- **`mixed`（散文 + 样例）**：改写前先**逐 token 标注**「可改散文区」与「不可改契约区」（代码块、表格、schema、枚举、映射）。只改散文说明与表格中的纯文案列；样例本体、围栏语言、字段名、符号全部保真。
- **`structured-format-or-sample`（格式/样例）**：原则上只碰开头的散文导语，样例本体零改。这类文件的「行数」往往就是格式契约的一部分（如 `hotfix-archive-format.md` 的 SQL 写法、`§10-quality-gate.md` 的 15 项 check 名）。

## 5. 行为保真机制（结构自由的前提）

因为允许重构结构，**不能靠逐行 diff 验证**，改用「契约清单」法。每个文件按以下流程处理：

1. **抽契约清单**：改写前，把文件里所有原子约束逐条列出——触发条件、路由/改走目标、规则红线、阈值数字、所有标识符、产物名、顺序依赖、被测关键字。
2. **标注可改区**（mixed/structured 文件）：逐 token 区分散文区与契约区。
3. **改写**：套用风格指南，可重组章节、表格转散文（仅限非契约表格）、调顺序。
4. **逐条核对**：拿契约清单回查新文，每条都在、含义不变、标识符一字不差。
5. **对抗校验**：换一个视角（子代理）拿原文契约清单去新文里找，找不到的就是丢了。
6. **机器验证**：`bun run check`、`bun run check:skills`、`bun test`（重点 `skill-frontmatter`/`skill-shape`/`skill-structure`/`strategy-templates`/`skills-audit`/`skills-sync-check`/`shared-case-qa`）。
7. **触发回归**：`description` 未改动确认；若正文改了同时作为触发词的词，确认与 `description` 保持同词（R8）。
8. **同源同步**（涉及 R10 文件）：确认所有副本同步改写、语义对齐。

## 6. 风险登记（全语料审计结果）

| # | 文件 | 风险 | 缓解 |
| --- | --- | --- | --- |
| 1 | `playwright-automation/references/cli-essentials.md` | 251/260 行，仅余 9 行 | 只做等行/减行改写，禁止净增行；合并标签、删冗余补充 |
| 2 | `playwright-automation/phases/§6-playwright-generate.md` | 208/260 行 | 拆句留意别逼近 260 |
| 3 | `case-hotfix/references/hotfix-archive-format.md` | 227/260 行，且大量 SQL/DDL/keywords/JSON 样例 | 只改散文说明，别扩进样例；样例本体零改 |
| 4 | 根 `CLAUDE.md`、`rules/project-workflow-rules.md` | 最高引用契约；emoji 表/KATA 通知模板/命令索引/环境变量名属机器级 | 最谨慎；契约表格保格式；同源重复同步（R10） |
| 5 | `.claude/prompt/_shared/case-qa.md`（symlink 别名 `skills/_shared/case-qa.md`） | 被 `shared-case-qa.test.ts` 断言 + 3 skill 共享 | 只改 canonical 源；留住测试命中的关键字串（R6） |
| 6 | 两对 `case-format-sample.*`（`case-draft` ↔ `case-edit`） | 同内容副本，改一份会分叉 | 同步改；或先确认 symlink 去重（§9） |
| 7 | `playwright-automation/prompts/agent-*`、`case-draft/prompts/agent-*` | category/severity 枚举、JSON 字段被契约测试依赖 | 不动枚举与字段语义（R6） |
| 8 | `playwright-automation/phases/§1-case-normalize.md` | 第 50/52 行连续短语样例是路由判定证据 | 保真不动 |
| 9 | `playwright-automation/phases/§10-quality-gate.md` | 15 项 check 名是 lint 标识符 | 当结构化表处理，名称零改 |
| 10 | 全部 `§<n>-*.md` | 文件名受 `PHASE_NAME_RE` 约束 | 不改文件名 |

## 7. 推进计划（试点先行 + 分批，全程 detached worktree）

遵守项目 worktree-first + 改后即测纪律。

- **阶段 0 — 风格指南落盘**
  把 §3 全文写成 `docs/prompt-style-guide.md`（病症 L/S/P + 不可改 R + 三类处理策略 + 术语对照表骨架），作为后续所有改写的依据。
- **阶段 1 — 试点（锁风格）**
  选 **playwright-automation**（大型多文件，含各类病症与高风险 `cli-essentials`）+ **defect-analyze**（小而典型）两个 skill，完整走 §5 八步流程。**交付后请用户 review**，锁定文风、术语对照表与排版尺度。
- **阶段 2 — 分批推进**（低风险 → 高风险）
  - 批 A：纯散文 SKILL/references（case-edit、infra-diagnose、knowledge-curate、workspace-manage、case-hotfix SKILL 等）
  - 批 B：mixed 的 phases/prompts（playwright 其余 phases、case-draft prompts）
  - 批 C：structured 与贴顶文件（`cli-essentials`、`hotfix-archive-format`、fewshots、`§10`）
  - 批 D：rules + 入口 + `prompt/_shared`（同源重复同步、契约引用，最谨慎，最后做）
- 每批一个 worktree，跑 `bun run check` / `bun test` / `check:skills` + 逐文件契约核对；合并回 `main` 前再跑一次 `bun test` 最终确认。

## 8. 验收与产物

- **产物**
  1. `docs/prompt-style-guide.md`——《kata 中文提示词风格指南》
  2. 改写后的约 50 个提示词文件
  3. 每文件「行为契约核对」记录（证明零语义丢失）
  4. 全仓术语对照表
  5. 本 design spec
- **验收口径**
  - 三类机器验证全绿：`bun run check`、`bun test`、`bun run check:skills`。
  - 逐文件契约核对无缺失；标识符/阈值/触发词零改动。
  - 同源重复块（R10）改写后一致。
  - 试点经用户确认。
  - 诚实声明已验证 / 未验证范围，不把局部通过说成全量通过。

## 9. 开放 / 待定项

- **风格指南位置**：已定 `docs/prompt-style-guide.md`（纯参考、不增运行时上下文）。如需强约束未来所有改写，可升格为 `.claude/rules/prompt-style-guide.md`。
- **`defect-analyze/templates/GUIDE.md`**：当前随 `templates/` 排除。是否纳入本次清通改写待定。
- **两对 fewshot 副本**：本次按 R10 同步改写。是否顺带 symlink 去重属结构变更、超出「语言优化」范畴，建议单独确认后另行处理。
- **`description` 冻结度**：默认只顺化语法、不动触发词与改走目标。若发现某条 `description` 本身翻译腔重且改动可能影响触发，须单独确认（受 skill 触发信号前置约束）。


