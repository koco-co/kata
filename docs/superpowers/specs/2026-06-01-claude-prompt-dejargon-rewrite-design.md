# 设计：.claude 提示词去黑话 + 官方 Skill 规范对齐重写

- 日期：2026-06-01
- 状态：设计已批准，二次修订对齐仓库现状（技能数 8、行数上限 300→500、验证手段不依赖 codex）
- 校准基准：Anthropic 官方 Skill authoring best practices（platform.claude.com）

---

## 1. 背景

`.claude` 下的提示词经多个模型反复迭代后，混入两类问题：

1. **GPT 翻译腔 / 抽象黑话**：忠实度、沉淀、锚点、闭环、心智、抓手、颗粒度等。无功能含义，只增加阅读成本。
2. **未验证的冗余规则**：上月在 Codex 用 `/goal` 让模型读自己的思维调用链、针对用例生成与 Playwright 脚本生成自迭代出来的一批规则。未经用户验证，实际冗余、可删可并。集中在 `case-draft`、`playwright-automation` 两个技能。

目标是把 `.claude` 全树的提示词拉回 **Anthropic 官方现行 Skill 编写规范**。

## 2. 目标

1. 全面去黑话、平实化重写，**语义不变**。
2. 删除或合并未验证的冗余规则；删改前先出清单交用户审。
3. 通篇对齐官方规范：**简洁、规则配理由、具体例子、术语一致、progressive disclosure、子文件一级直链**。

## 3. 范围

范围按本仓库**真实的同级目录结构**列。SKILL.md 同级 lint 白名单（`skill-shape.ts` 规则 S5）共 7 个目录：`phases / prompts / references / fewshots / rules / scripts / templates`，其中 `scripts/` 是代码、不在改写范围。当前实际是 **8 个技能**（`case-draft`、`case-edit`、`case-hotfix`、`defect-analyze`、`infra-diagnose`、`knowledge-curate`、`playwright-automation`、`workspace-manage`；`_shared` 不是技能）。

**改写（In）：**

- `.claude/skills/**`：8 个技能的
  - `SKILL.md`
  - `rules/**`（规则）
  - `references/**`（参考资料）
  - `fewshots/**`（对照示例）
  - `prompts/**`（subagent 提示词）
  - `phases/**`（`playwright-automation` 的阶段提示词）
  - `templates/**`（产物模板中的提示词文案部分）
- `.claude/rules/**`
- `.claude/prompt/**`
- 根 `CLAUDE.md`、`.claude/rules/project-workflow-rules.md`
- `INSTALL.md`（若含提示词文案）
- **行数上限上调**：`.claude/scripts/_shared/lint/skill-shape.ts` 的 `SKILL_MD_LINE_LIMIT` 由 `300` 上调到 `500`，对齐官方 500 行标准，并同步更新对应 lint 测试断言。这是下方 Out「`scripts/` 代码不动」的**唯一明确例外**。

**不动（Out）：**

- `.claude/scripts/**` 的代码逻辑（唯一例外：上面的行数上限常量及其测试）
- 测试断言的业务含义
- `.claude/hooks`、`.claude/plugins`（第三方）
- subagent prompts 的**触发 / 调用契约**（入参、调用方式、返回约定）——只去黑话，不动接口
- `templates/**` 中的结构 / 字段 / 占位符——只去黑话，不动模板骨架
- **codex 全量迁移与触发链调试**：本次只在 Claude 体系内重写并验证；迁移到 codex、用裸输入实跑触发链调试由本任务**之后的独立阶段**单独进行，不在此次范围。

## 4. 校准基准（官方 Skill 规范）

基准为 Anthropic 官方《Skill authoring best practices》。重写时对标以下原则：

- **简洁优先**：只补 Claude 不知道的上下文。每段话都要问「Claude 真需要这个解释吗？能不能假设它已经知道？」。SKILL.md body 守 500 行上限，超了就拆子文件（本项目 lint 当前卡 300 行，本任务同步上调到 500 与官方一致；现有 8 个 SKILL.md 最长 74 行，远低于阈值，行数不是当前痛点）。
- **按任务脆弱度匹配自由度**：多解法、靠上下文判断的任务 → 给方向（高自由度）；操作脆弱、必须固定顺序的任务 → 给精确护栏（低自由度）。不要一刀切。
- **规则配理由，而非堆禁令**：官方明确把成串的全大写 `ALWAYS / NEVER / MUST` 列为反模式——模型会照字面走、漏掉作者没预想到的边界，或在该判断的地方过度套用。写法是「陈述规则 + 解释为什么」，让理由成为模型泛化的判据。例：「用构造器注入；字段注入破坏可测性，因为脱离 Spring 上下文无法 mock」优于「禁止字段注入」。
- **description 是触发命中关键**：第三人称，写清「做什么 + 何时用」，含具体触发词。注意 Claude Code 中 description（含 when_to_use）合计约 1536 字符会被截断。
- **具体例子胜过抽象描述**：output 质量依赖示例时，给 input/output 对照对（官方 examples pattern）。
- **progressive disclosure**：SKILL.md 当目录，细节下沉子文件，按需加载。
- **子文件一级直链**：所有子文件从 SKILL.md 直接链接，不要 `SKILL.md → rules/x.md → references/y.md` 两级嵌套（嵌套会导致 Claude 只 `head -100` 预览、读不全）。
- **超 100 行的参考文件加目录（Contents）**，保证 Claude 预览时能看到全貌。
- **术语一致**：一个概念全程用同一个词。
- **eval / 反馈回路**：改一个技能立刻跑该技能相关测试，绿了再下一个。

**自由度分级落地约定（本项目）：**

全树统一采用「陈述规则 + 解释为什么」的带理由指引写法（贴官方主轴）。对 `case-draft`、`playwright-automation` 这类低自由度强约束技能中的 `hard_rule`（SKILL.md 正文「## 硬规则」章节），保留其精确性（这是官方认可的低自由度护栏场景），但**改写时仍补上「为什么」的一句理由**，使其同时满足精确与可泛化，而非退化为纯禁令清单。

## 5. 改写准则（唯一标尺）

本节是整个重写的唯一标尺和术语来源，保证 8 个技能用词一致。落地时先整理成独立的「改写准则」文档（见 Phase 0）。

### 5.1 减法：黑话 → 平实

种子表分两类，对应不同验收方式（见 §9）。当前全树命中量级：A 类约 37 处、B 类约 10 处，分布在 18 个文件。

**A. 可 1:1 机械替换（可 grep 清零）：**

| 黑话 | 改成 |
|---|---|
| 沉淀 | 记录 / 保存 / 写入 |
| 锚点 | 入口 / 定位点 / 起点 |
| 心智 | 用户预期 |
| 抓手 / 赋能 / 颗粒度 | 删，换具体说法 |
| 对齐 | 对账 / 核对 / 保持一致 |
| 收敛 | 缩小范围 / 定位到唯一 |
| 漂移 | 偏离 / 变了（product drift → 产品行为变了） |
| surface 假通过 | 表面通过（没验业务） |
| surface 契约测试 | 只测页面表层不测业务结果 |

**B. 需逐处人工判断（列入审计清单，不能 grep 验收）：**

| 黑话 | 处理 |
|---|---|
| 忠实度 | 按语境改：「步骤要真做、断言要断真实业务结果」 |
| 闭环 | 多为凑词，逐处判断：能删则删，否则改「完整跑完 / 处理到底」 |

**保留术语白名单（有功能，不动）：** `证据`、`quality-gate`、`handoff`、`locator`、`fixture`、`session`、`preflight`、`spec`、`hard_rule`、`幂等`、`对账`（reconcile 固定译法）、英文 phase id（`case-normalize` 等）、Commit type。

**"中英夹杂"的定义（钉死，消除 §9 与白名单的冲突）：**

- "中英夹杂"**专指**可被平实中文 1:1 替换的英文黑话直译（如 surface、align 等）。
- **技术术语、标识符、id 类英文不算"中英夹杂"**：白名单内的 `locator`、`fixture`、`hard_rule`、phase id、Commit type 等保留不计入违规。
- §9 的"无中英夹杂"成功标准按此定义判定。

### 5.2 冗余 / 未验证规则判定（命中即标「拟删 / 拟合并」，过目后才动）

- **重复**：与同技能另一条表达同一约束 → 合并。
- **空泛防御**：只喊「确保 / 必须 / 严格」却无具体动作或判定条件，删掉不影响任何已有行为 → 删。
- **自指元规则**：Codex 自迭代出的「如何思考 / 如何保证质量」抽象条款，无可执行落点 → 删。
- **过度细化**：一个简单约束被拆成多条近义条款 → 合并。
- **保留**：有明确触发条件 + 明确动作 / 禁止项 + 对应到真实产物或测试的规则。

判断偏保守：吃不准就合并不删除；边界情况在审计清单标出来交用户定。

### 5.3 加法：正向准则（官方校准版）

1. **只补 Claude 不知道的**：删掉解释常识的句子（如"PDF 是什么"），假设 Claude 已经聪明。
2. **规则配理由**：关键规则写「做什么 + 为什么」，而非单向命令；避免成串全大写禁令。
3. **具体例子**：output 质量依赖示例的，给 input/output 对照对；吃不准的下沉到 `fewshots/` 或 `references/`。
4. **量化**：阈值用数字（次数、字符数、条数），不用「适当 / 尽量」。
5. **信是红线**：**绝不为了行文好看捏造 runtime 里不存在的例子、字段或数据**——kata 规则直接驱动真实执行。
6. **术语一致**：本准则文档的对照表是唯一术语来源，8 个技能统一用词。

**示例（带理由指引式重写，对照感受标准）：**

> 原：覆盖忠实度：每条 expected_visible_result 必须断言为真实业务结果并真跑通。
>
> 改：每条 expected_visible_result 都要断言到真实业务结果并真跑通过——因为只断言"无报错 / 按钮可见"无法证明业务真的正确，这类弱断言会在功能坏掉时仍然通过。
> - 例（导出类用例）：断言下载文件存在、行数与列表一致；不要只断言"点击后无报错"。
> - 自检：这条断言失败时，是否真能说明业务坏了？不能，就是弱断言。

### 5.4 底线

- **语义不变（P0）**：每条规则改写后，「要求做什么 / 禁止做什么 / 触发条件」必须逐条等价；吃不准标出来问用户，绝不擅自放宽或收紧。
  - `case-draft` / `playwright-automation` 的 hard_rule 是 SKILL.md 正文的「## 硬规则」章节，**仓库无 SHA/COUNT 基线测试**。语义等价的验收口径 = 人工逐条「要求 / 禁止 / 触发条件」对照 + `bun run check:skills`（结构 / 装饰标记）+ case-draft e2e fixture replay 通过。
  - 无基线的纯文本规则：逐条「要求 / 禁止 / 触发条件」对照；拿不准的标出来问用户。
- **信是红线**：不为行文好看捏造不存在的例子 / 字段 / 数据。
- **行数约束**：SKILL.md 守 500 行（本任务把 `skill-shape.ts` 的 lint 上限由 300 上调至 500 后，文档目标与 lint 一致）；对照例子、术语表、自检项等具体内容下沉到该技能 `fewshots/` `references/` `rules/`。

## 6. 工作流（detached worktree）

按项目规则在 detached worktree 内工作，五阶段推进（Phase 1 为新增的"基线先行"）。

**Phase 0 · 准则定稿**
把 §4 + §5 整理成独立的「改写准则」文档，作为整个重写的唯一标尺和术语来源。文档须显式包含：自由度分级落地约定、可 grep 项 vs 人工项拆分、白名单与"中英夹杂"定义。

**Phase 1 · 现状基线固化（动笔前）**
在改任何字之前，对每个受影响技能存下"干净 GREEN 基线"，作为后续对照：

- `bun test` 全量 + 受影响 `bun test .claude/scripts/_shared/tests/<area>` + `bun run check:skills`，存通过记录。
- 快照 8 个 SKILL.md 的现行 `description` 原文与 `## 硬规则` 章节原文，作为后续人工逐条对照的基线（本次不跑 codex 触发链）。

**Phase 2 · 全量审计（产「审计清单」，先交用户审）**
扫描范围内全部文件，产出每文件改动清单，分栏：

- **黑话命中（可 grep）**：逐处列出 A 类黑话词 + 拟改写法。
- **黑话命中（需判断）**：逐处列出 B 类（忠实度 / 闭环等）+ 拟改写法 + 理由。
- **description 改动（单列）**：description 是触发命中关键、爆炸半径最大，单独列、单独审、单独做 description 关键词 / 路由表逐条对照；标注是否触及 1536 字符截断边界。
- **冗余 / 未验证规则**：逐条列出拟删 / 拟合并的规则 + 原因（对应 §5.2 哪条判定），重点 `case-draft`、`playwright-automation`。

这份清单是**审查闸门**——尤其规则删除与 description 改动，用户过目点头后才进 Phase 3。

**Phase 3 · 分技能落地（worktree 内）**
按技能逐个重写：SKILL.md 保持精炼（守 500 行），具体内容下沉到该技能 `fewshots/` `references/` `rules/`；子文件保持从 SKILL.md 一级直链。**改一个技能立刻跑该技能相关测试**，绿了再下一个。每技能一个 commit。

**Phase 4 · 验证 + 合并**
`bun run check:skills` + `bun test` 全绿。改过 `description` 的技能，对照 Phase 1 快照逐条核 description 触发词 / 路由关键词未丢失（本次不在此跑 codex 触发链）。hard_rule 改动用人工逐条对照 + `check:skills` + case-draft e2e fixture replay 验收（无 SHA 基线）。行数上限上调（300→500）随对应 commit 更新 `skill-shape.ts` 与其测试。全绿后 `git merge --no-ff` 回 main、push、清理 worktree。codex 全量迁移与触发链调试为本任务之后的独立阶段。

## 7. 产物清单

1. 改写准则文档（标尺，含自由度分级 / grep-vs-人工 / 中英夹杂定义）
2. 现状基线记录（Phase 1：`bun test` / `check:skills` GREEN 记录 + 8 个 SKILL.md 的 description / 硬规则原文快照）
3. 审计清单（可审，含 description 改动单列、拟删 / 拟合并规则）
4. 重写后的 `.claude` 全树提示词
5. 验证报告（跑了哪些测试 + 结果、description 人工对照结论、行数上限 300→500 调整说明）

## 8. 风险与缓解

| 风险 | 缓解 |
|---|---|
| **触发链漂移**（改 description 后 skill 触发不准） | description 在审计清单单列单审；改后逐条核触发词 / 路由关键词与 Phase 1 快照一致；注意 1536 字符截断边界（本次不跑 codex 触发链，迁移阶段再由 codex 实跑回归） |
| **hard_rule 语义漂移**（无 SHA 基线可锁） | 人工逐条「要求 / 禁止 / 触发条件」对照 + `bun run check:skills` + case-draft e2e fixture replay；偏保守不放宽 |
| **lint 红线**（frontmatter 白名单 / 行数上限 / 禁装饰标记） | frontmatter 守 11 字段白名单；行数守 500（已由 300 上调）；禁装饰契约标记（`DECORATIVE_CONTRACT_SECTION`）；改后跑 `check:skills` 与相关 lint 测试 |
| **语义漂移**（改写悄悄改了规则效力） | hard_rule 人工逐条对照 + e2e fixture replay；无基线规则逐条「要求 / 禁止 / 触发条件」对照；吃不准标出来问用户 |
| **退化为纯禁令清单**（违背官方"规则配理由"） | 改写时关键禁令一律补「为什么」；审计抽查全大写 ALWAYS/NEVER/MUST 成串出现处 |
| **误删有用规则** | 审计清单先交用户审；偏合并不偏删除；worktree + git 全程可回滚 |
| **跨技能术语不一致** | 准则文档 + 对照表是唯一术语来源 |

## 9. 验证与成功标准

**验证命令：**

- `bun run check:skills`（runtime 契约：frontmatter 11 字段、行数上限、结构、装饰标记）
- `bun test`（全量）+ 受影响 `bun test .claude/scripts/_shared/tests/<area>`
- case-draft e2e fixture replay（hard_rule 改动时）：`bun run test:e2e:fixture`
- 改过 description 的技能：对照 Phase 1 快照人工核触发词 / 路由关键词（本次不跑 codex）

**成功标准：**

1. §5.1-A 类黑话词全树 grep 命中为 0（或保留项有明确理由）；B 类逐处经审计清单处理完。
2. 通篇对齐官方规范：简洁、规则配理由（无成串全大写禁令）、具体例子、术语一致、子文件一级直链、SKILL.md ≤ 500 行。
3. 按 §5.1 定义无"中英夹杂"（白名单技术术语不计）。
4. 拟删 / 拟合并的冗余规则、description 改动全部经用户点头后处理完。
5. `check:skills` + `bun test` 全绿；改过的 description 经人工对照 Phase 1 快照确认触发词未丢；行数上限上调后 `skill-shape` 相关测试绿。
6. **语义等价**：没有任何规则的实际效力在未经用户同意下被改变（hard_rule 以人工逐条对照 + case-draft e2e fixture replay 为准）。
