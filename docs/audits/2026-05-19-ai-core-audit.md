# kata .ai/core audit — 2026-05-19

> 只读 audit。不修改任何源文件。
> spec: `docs/superpowers/specs/2026-05-19-ai-core-audit-design.md`

## 摘要

- **总览:** P0 = 4,P1 = 10,P2 = 10(合计 24);另有 8 条正面观察
- **维度分布:**
  - A. 文本:0 P0 / 4 P1 / 3 P2
  - B. 触发链路:1 P0 / 2 P1 / 1 P2 / 2 正面
  - C. 产物位置:3 P0 / 2 P1 / 1 P2 / 2 正面(本维度问题最严重)
  - D. 语言一致:0 P0 / 0 P1 / 3 P2 / 2 正面
  - E. 结构精简:0 P0 / 2 P1 / 2 P2 / 2 正面

### Top 3 修复杠杆

1. **[B1](#b1-p0-update-docs-命令在-agentsmd-声明但无任何源) — 处理 `/update-docs` 路由幽灵命令**
   单文件改动(三选一:补 `.ai/core/commands/update-docs.command.yaml` / 改 AGENTS.md 第 38 行换成具体命令 / 直接删除)。低成本、彻底消除 P0 路由不一致。

2. **[C1](#c1-p0-workspacexyzhfeatures-全员违反英文-slug-规约)+[C2](#c2-p0-单个目录名含中文--全角括号--逗号)+[C3](#c3-p0-176-字符超长-feature-slug) — 修 case-draft 在 fallback 路径下生成 slug 的逻辑**
   三个 P0 同根:case-draft 的 error-fallback 把用户输入(中文 / 拼音 / 多模块串联描述)直接落为 feature slug。单 skill 修复 + 历史目录批量重命名,可一次解决三条 P0,且辐射缓解 [A2](#a2-p1-case-draftskillyaml-单条-yaml-value-极长)(skill.yaml 中针对 fallback 的负面字面规则可大幅瘦身)、[B2](#b2-p1-case-draft-命名破例promptworkflow-文件名与-slug-不一致)。这条 leverage 最大。

3. **[E1](#e1-p1-worker-agentyaml-boilerplate-7-处完全相同)+[E2](#e2-p1-agents-role-字段语义不一致)+[A4](#a4-p1-同一规则kataaireposai-read-onlyai-三处独立表述) — 在 AgentContract 引入 `extends:` / 在 guards 引入 `inherits_guard:` 一次性消除散落同事实**
   1 个 schema 升级 + 1 处 base 文件;同时把 7 个 worker boilerplate / 4 处 `.kata/repos` read-only 收敛到单源。每次新增/调整规则不再需要 N 处同步,长期收益显著。

### 建议执行顺序

先 B1(单文件,5 分钟)→ 再 C 三条(case-draft fallback 是源,目录重命名是清理)→ 再 E1+E2+A4(机制升级,顺手清 D1/D2 之类小条)→ 最后扫剩余 P1/P2。

**不**建议优先做 D 维度(全是 P2,影响小);**不**建议优先做 A5-A7(纯密度问题,工具收益低于 case-draft 修复)。

## 范围与方法

- **主范围:** `.ai/core/**` + `AGENTS.md`(及 `CLAUDE.md` symlink)+ `README.md` / `README-EN.md` / `INSTALL.md` / `CHANGELOG.md` + `workspace/` 目录骨架
- **cross-check:** `.claude/**`、`.agents/**`(仅 `grep -l`)、`engine/tests/**` grep schema/skill 引用、`package.json` scripts、`.github/workflows/**` 入口
- **判定基准:** 内部不一致 / 决策负担 / 可维护性
- **不在范围:** `engine/src/**`、`plugins/**`、`tools/**`、用户在 `workspace/` 下的产物内容、git 历史

## A. 文本审查(prompts / skills 内容)

### A1 [P1] playwright-automation/skill.yaml 单条 yaml value 极长

- **位置:** `.ai/core/skills/playwright-automation/skill.yaml:61-63`
- **证据:** 第 61 行单条 yaml value 超过 5000 字符,第 62、63 行同类。`awk 'NR==61 {print length($0)}' .ai/core/skills/playwright-automation/skill.yaml` 验证。内容为大量「不得写 "..."」类否定列举(枚举字面字符串)。
- **影响:** 模型每次加载该 skill 都要消化这条规则;否定列举字面字符串本质上是黑名单 prompt 工程,易扩散且不可维护,新增一条短语就要改长字符串。
- **建议:** 把否定字面列表迁移到 `references/forbidden-phrases.md`(若需保留所有字面)或换成一条「正例 + 边界条件」的描述。yaml 中只保留语义化判定准则(如「禁止 mid-stage 进度文本」)。

### A2 [P1] case-draft/skill.yaml 单条 yaml value 极长

- **位置:** `.ai/core/skills/case-draft/skill.yaml:59-61`
- **证据:** 三条 must-trigger 规则单条均 > 600 字符,内嵌「错误顺序示例 / 正确顺序示例」结构。`awk 'NR>=59 && NR<=61 {print NR":"length($0)}' .ai/core/skills/case-draft/skill.yaml` 验证。
- **影响:** skill.yaml 本应是「触发条件 + 边界」声明,内嵌示例和工具调用顺序属于 reference 内容,塞进 yaml 增加每次加载成本。
- **建议:** 把工具调用顺序示例迁到 `references/source-intake-protocol.md`(该 reference 已存在),skill.yaml 只保留一句声明「source-intake 顺序见 references/source-intake-protocol.md」。

### A3 [P1] error-fallback-paths.md 规则密度 63%

- **位置:** `.ai/core/skills/case-draft/references/error-fallback-paths.md`
- **证据:** 71 行内含 45 处「MUST/必须/不得」标记,占比 63.38%。`grep -cE '(MUST|ALWAYS|严禁|必须|不得|never|NEVER)' .ai/core/skills/case-draft/references/error-fallback-paths.md` 验证。
- **影响:** 该 reference 全部是规则,无叙事 / 无场景 / 无正例,读者(包括 LLM)难以从中提取「哪条规则在什么场景生效」。
- **建议:** 重组为「场景 → 触发 → 处理 → 反例」四段式;每段不超 1 个 MUST 标记。

### A4 [P1] 同一规则「.kata/repos/ read-only」三处独立表述

- **位置:**
  - `.ai/core/skills/conflict-analyze/skill.yaml:50` — `.kata/repos/{project}/** 下的源仓库为只读,一律不得改写。`
  - `.ai/core/skills/diff-scan/skill.yaml:50` — `.kata/repos/{project}/** 下不得 push、不得 commit、不得写入。`
  - `.ai/core/skills/workspace-manage/skill.yaml:50` — `.kata/repos/{project}/ 下的源仓库仅为只读证据源,不得改动。`
- **证据:** `grep -n '\.kata/repos' .ai/core/skills/*/skill.yaml`
- **影响:** 三处表述措辞不一(「不得改写」/「不得 push、不得 commit、不得写入」/「不得改动」),修改时易遗漏,且单看任一句无法判断完整禁止集。AGENTS.md `Workspace Boundary` 也声明了同一规则,实为四处。
- **建议:** 抽到 `.ai/core/guards/registry.yaml` 或 `.ai/core/rules/repo-readonly.md` 单一来源,各 skill.yaml 改为 `inherits_guard: repo-readonly`(或当前等价机制)。

### A5 [P2] source-intake-protocol.md 规则密度 34%

- **位置:** `.ai/core/skills/case-draft/references/source-intake-protocol.md`
- **证据:** 77 行 26 处规则。`wc -l` + `grep -c` 验证。
- **影响:** 已比 A3 缓和但仍偏高,可读性较差。
- **建议:** 同 A3 思路,引入「场景 → 处理」骨架。

### A6 [P2] SKILL.md projection 规则密度偏高

- **位置:** `.claude/skills/playwright-automation/SKILL.md`(28%)、`.claude/skills/case-draft/SKILL.md`(25%)
- **证据:** `grep -cE '(MUST|ALWAYS|严禁|必须|不得|never|NEVER)' .claude/skills/{playwright-automation,case-draft}/SKILL.md` 与对应 `wc -l`
- **影响:** projection 是 LLM 入口,规则密度过高的 SKILL.md 直接挤占用户上下文。
- **建议:** 把 SKILL.md 中的细则迁移到 reference,顶层 SKILL.md 只保留路由摘要 + 主流程 + 链到 references。

### A7 [P2] reference 文件单体偏大(≥190 行)

- **位置:**
  - `.ai/core/skills/playwright-automation/references/env-preflight.md`(248 行)
  - `.ai/core/skills/case-hotfix/references/hotfix-archive-format.md`(197 行)
  - `.ai/core/skills/playwright-automation/references/playwright-generate.md`(190 行)
- **证据:** `wc -l .ai/core/skills/*/references/*.md | sort -rn | head -5`
- **影响:** 单文件加载成本高;reference 可读性下降。
- **建议:** 按子主题(如 env-preflight = profile-detect + session-check + login-flow)分文件,主 reference 留索引。

## B. 触发链路(routing)

### B1 [P0] `/update-docs` 命令在 AGENTS.md 声明但无任何源

- **位置:**
  - 声明:`AGENTS.md:38` — `` | `/update-docs` | 同步命令索引到 README + 更新 CHANGELOG... | ``
  - 缺失:`.ai/core/commands/update-docs.command.yaml`、`.claude/INDEX.md`(无该行)、全仓 `find . -name '*update-docs*'` 0 结果
- **证据:** `grep -n update-docs AGENTS.md` + `ls .ai/core/commands/` + `find . -maxdepth 4 -name '*update-docs*' -not -path './node_modules/*'`
- **影响:** 用户/coding-agent 看到 AGENTS.md 提示「提交前建议运行 `/update-docs`」却找不到任何实现,会以为是隐藏命令或 dispatch 失败。路由声明与实现不一致,P0 阻断。
- **建议:** 三选一:(a)若该命令应存在,补 `.ai/core/commands/update-docs.command.yaml` + 对应 skill/script;(b)若该能力由其他工具承担,改写 AGENTS.md 第 38 行,改用具体命令(如 `bun engine/bin/kata docs sync`);(c)若已废弃,删除该行。

### B2 [P1] case-draft 命名破例:prompt/workflow 文件名与 slug 不一致

- **位置:**
  - `.ai/core/workflows/case-draft-from-prd.workflow.yaml`(其他 8 个均为 `<slug>.workflow.yaml`)
  - `.ai/core/prompts/designing-case-matrix.prompt.yaml`(其他 7 个均为 `<slug>.prompt.yaml`,case-draft 缺 `case-draft.prompt.yaml`)
- **证据:** `ls .ai/core/{workflows,prompts}/ | grep -E '(case|prompt|workflow)'`
- **影响:** 9 个 skill 中 1 个破例。新人按 `<slug>.workflow.yaml` 模式找文件会 miss,需要回查 INDEX.md 才能定位。决策负担。
- **建议:** 二选一:(a)将文件重命名为 `case-draft.workflow.yaml` 与 `case-draft.prompt.yaml`,把语义差异(from-prd / designing-case-matrix)放到文件内 `kind:` 或 `variant:` 字段;(b)若多 prompt/workflow 是设计意图,在 AGENTS.md 或 `.ai/core/rules/` 明确「skill 可有多个 prompt/workflow,文件名按主题」规约,统一所有 skill(目前只 case-draft 一处不一致)。

### B3 [P1] playwright-automation 体量是其他 skill 的 4-20x

- **位置:**
  - `.ai/core/skills/playwright-automation/skill.yaml`(235 行)
  - `.ai/core/workflows/playwright-automation.workflow.yaml`(135 行,11 step)
  - `.ai/core/skills/playwright-automation/references/`(15 文件,1402 行总计)
- **证据:** `wc -l` 比对各 skill;对比:bug-file/conflict-analyze/diff-scan 平均 skill 60 行 / workflow 55 行 / 0 reference
- **影响:** 该 skill 占 `.ai/core/skills` 总体量约 60%;每次触发该 skill 都把大量内容压入上下文。playwright-automation 路由本身复杂(env-preflight / session-check / login-flow / probe / repair),但当前没有显式的内部子 skill 切分。
- **建议:** 按子流程拆为 2-3 个内部 sub-skill(如 `playwright-automation/env-preflight@1`、`playwright-automation/probe@1`、`playwright-automation/run@1`),主 skill 仅做编排;或将 references 按子主题再分目录(env / probe / run / handoff)。

### B4 [P2] bug-file / conflict-analyze / diff-scan 完全无 references

- **位置:** 三个 skill 目录均为 `.ai/core/skills/<slug>/{skill.yaml, references/}` 但 references/ 空
- **证据:** `find .ai/core/skills/{bug-file,conflict-analyze,diff-scan}/references -type f` 无输出
- **影响:** 这三个 skill 完全靠 60 行内 skill.yaml + 40 行 prompt.yaml 工作。若实现需要分阶段规则或模板,无 reference 可挂;若实现不需要,空的 `references/` 目录是冗余。
- **建议:** 让 owner 确认:若不需要 references,删除空目录并在 SKILL.md 不引用 references 段落;若需要,补对应模板。

### B5 [正面] projection lock check 通过

- **证据:** `bun engine/bin/kata ai-core projection lock check` → `ai-core projection lock check passed`
- 说明源 ↔ 投影一致,本 audit 引用的所有 `.claude` 渲染内容可信。

### B6 [正面] 9 个 slash command 索引完整一致

- **证据:** AGENTS.md 9 行、`.ai/core/commands/*.command.yaml` 9 个、`.ai/core/commands/*.id` 字段 9 个,三组完全一一对应(除 B1 的 `/update-docs` 例外)。

## C. 临时产物输出位置

### C1 [P0] workspace/xyzh/features/ 全员违反「英文 slug」规约

- **位置:** `workspace/xyzh/features/`(25 个目录)
- **证据:** AGENTS.md 第 31 行声明 `{module} 和 {slug} 一律英文(lowercase ASCII,连字符分隔),不得用中文拼音`。实测 25 个目录中 24 个使用拼音(`shu-ju-mu-lu-guan-li` = 数据目录管理 拼音、`liu-cheng-zhong-xin` = 流程中心 拼音、`fa-bu` = 发布 拼音 等)。`find workspace/xyzh/features -maxdepth 1 -type d | grep -cE '(shu-ju|guan-li|liu-cheng)'` = 24。
- **影响:** 与规约直接抵触;新增 feature 时新人不知按拼音还是英文;若工具(case-draft)按规约期望英文 slug 处理,xyzh 项目会持续触发命名分支或 error-fallback。
- **建议:** 二选一。(a)主张规约 — 批量重命名 xyzh/features 为英文 slug;`feature-id` 持久映射写入 `metadata.yaml`;(b)主张现实 — 修改 AGENTS.md 第 31 行,允许新客户先用拼音 slug 占位、后续迁移;并补「占位 → 迁移」工作流。强烈建议 (a)。

### C2 [P0] 单个目录名含中文 + 全角括号 + 逗号

- **位置:** `workspace/dataAssets/features/2026-04-dq-per-rule-toggle/关闭，影响规则任务中的对应规则是否运行（待评估，不好实现）/`(含 `images/` 子目录)
- **证据:** `find workspace -type d | grep -E '[一-龥]'` 第一条
- **影响:** 同时违反 slug 英文化、目录名最长 50 字、可移植性(全角逗号/括号在某些工具链上需 URL 编码)。从父目录路径看是误把「评估注释」当成目录名建出来的(可能由 case-draft fallback 误判)。
- **建议:** 立即重命名为短 slug,把原中文描述写到 metadata.yaml `notes:` 字段;并审 case-draft 是否在 fallback 路径下会把用户输入直接当 slug。

### C3 [P0] 176 字符超长 feature slug

- **位置:** `workspace/xyzh/features/2026-04-20260410-shu-ju-huo-jia-guan-li-shu-ju-ji-guan-li-shu-ju-huo-jia-guan-li-api-guan-li-shu-ju-huo-jia-shu-ju-ji-zi-yuan-shu-ju-huo-jia-api-zi-yuan/`
- **证据:** `find workspace -path '*/features/*' -maxdepth 4 -type d | awk '{ if (length>150) print length": "$0 }'`
- **影响:** macOS HFS+/APFS 文件名最长 255 字节(UTF-8 拼音 ~1 字节/字符,该名 176 字符仍在限内但接近);某些工具链(zip/tar/外部同步)对路径段长度有更严限制(< 100);git index 处理冗长路径性能下降。
- **建议:** 把 slug 拆为 `2026-04-shu-ju-huo-jia-api-zi-yuan` 这类主题级 slug,长描述放 metadata.yaml。再次提示这类目录从源头看是 case-draft 误把多模块串联描述写成 slug,需修 skill 而非只清目录。

### C4 [P1] `xyzh` 客户简称未在 AGENTS.md 列出

- **位置:** AGENTS.md 第 28 行客户简称列表 `dfsyc、tj、sc、yht、lt、ltqc、jg717、zdxx、gate2`,无 `xyzh`
- **证据:** `grep -E 'dfsyc|xyzh' AGENTS.md` 仅匹配 dfsyc
- **影响:** xyzh 客户项目已建立(`workspace/xyzh/`)但规约未追加,违反「显式列举」原则;后续 audit / lint 工具(若按列表校验)会拒绝 xyzh 路径。
- **建议:** 把 `xyzh` 补入 AGENTS.md 列表;若有更多新客户,集中补一次。

### C5 [P1] worktree 规约 vs Claude Code harness 实际行为不一致

- **位置:**
  - 规约:AGENTS.md 第 65、69 行 `.worktrees/<slug>`
  - 现实:`.claude/worktrees/<random>`(本次 audit 即在 `.claude/worktrees/pensive-mclaren-494664/` 中运行)
- **证据:** `ls .worktrees 2>/dev/null` 不存在;`git worktree list` 中显示的活动 worktree 位于 `.claude/worktrees/`
- **影响:** AGENTS.md 第 5 节描述的「`git worktree remove .worktrees/<slug>` 清理」步骤在 Claude Code session 中不适用(因 harness 自管);新人按规约找 worktree 找不到。
- **建议:** 在 AGENTS.md 「Worktree-First Workflow」补一段「Claude Code harness 自动 worktree 在 `.claude/worktrees/<random>`,session 结束由 harness 回收;仅当用户/skill 显式调 `superpowers:using-git-worktrees` 时才落 `.worktrees/<slug>`」。

### C6 [P2] features/{*}/tests/cases/ 下中文目录名

- **位置:** `workspace/dataAssets/features/2026-04-dq-builtin-completeness-json-key-range/tests/cases/{key被删除后关联影响,多数据源兼容性,大数据量与层级校验,...}`(7 个)
- **证据:** `find workspace/dataAssets/features -path '*/tests/cases/*' -type d | grep -E '[一-龥]'`
- **影响:** AGENTS.md 规约只覆盖 `features/{slug}` 一层,未明确 `features/{slug}/tests/cases/` 是否同规;现状中文 case 名兼具可读性优势(测试用例需要中文标题),但与 slug 规约边界含糊。
- **建议:** 在 AGENTS.md Feature Naming 章节补「`tests/cases/` 下的 case 目录可用中文(对应人类可读 case title);features 一级 slug 必须英文」。一句话边界化即可,不需要重命名。

### C7 [正面] `.kata/repos/` read-only 多层保护

- **证据:** `grep -rn '\.kata/repos' .ai/core/ | head -20` 显示:`threat-model.yaml:12` 标注、9 个 worker agent.yaml 第 16-20 行列入 read-only paths、4 个 workflow 评估 `must_not_write: [".kata/repos/**"]`、case-draft-from-prd workflow 第 86 行 `may_not_write`。
- 说明该规约由 threat-model + agents + workflows + evals 四层共同保护,实际写入难度高。

### C8 [正面] env-preflight 中间产物声明清晰

- **证据:** `.ai/core/skills/playwright-automation/skill.yaml:107-108` 明确声明临时脚本只可写 `mktemp -d /tmp/kata-playwright-preflight-*` 或 `results/<run-id>/playwright/preflight/`,且依赖解析有备用路径。中间产物落点声明完整。

## D. 语言一致性

### D1 [P2] skill.yaml.summary 与 command.yaml.summary 全员不一致(9/9)

- **位置:** `.ai/core/skills/*/skill.yaml` description.summary vs `.ai/core/commands/*.command.yaml` summary
- **证据:** 9 个 skill 全部对照,`skill.yaml.summary == command.yaml.summary` = ✗ (9/9);但 `command.yaml.summary == AGENTS.md 第三列` = ✓ (9/9)
- **影响:** 双轨摘要看似冗余,但实际上 skill.yaml 是「写给 LLM 的触发说明」(更具体,如「设计稿、Lanhu、Axure」),command.yaml 是「写给用户的命令索引」(更抽象,如「设计源」)。设计本身合理,但 AGENTS.md 与任何 reference 都未声明双轨规约,新人看到差异会以为是 bug 想修。
- **建议:** 在 AGENTS.md 「Runtime Context」段或 `.ai/core/contracts/PromptContract*` 处补一句「`skill.yaml.summary` 面向 LLM 触发判定,`command.yaml.summary` 面向用户索引展示;两者可不同」。

### D2 [P2] workspace-manage skill.yaml summary 语法不完整

- **位置:** `.ai/core/skills/workspace-manage/skill.yaml:6`
- **证据:** `kata 功能菜单，与工作区的创建、初始化、自检及收尾。` — 没有完整动词短语,前半「kata 功能菜单」(名词)与后半「与工作区的创建...」(动作)在句法上接不上;对照 command.yaml「显示 kata 功能菜单和管理项目工作区。」结构完整。
- **影响:** 单条文本,影响小,但 LLM 触发分类可能因短语断裂而误判。
- **建议:** 改为 `显示 kata 功能菜单,并执行工作区的创建、初始化、自检与收尾。`(或与 command.yaml 同句)。

### D3 [P2] case-draft 设计源列举的具体度不一致

- **位置:**
  - `.ai/core/skills/case-draft/skill.yaml:3` — `以 PRD、设计稿、Lanhu 或 Axure 等需求源生成 QA 测试用例。`
  - `.ai/core/commands/case-draft.command.yaml` — `根据需求文档、PRD 或设计源生成 QA 测试用例。`
- **证据:** skill.yaml 列举具体设计源「Lanhu、Axure」,command.yaml 抽象为「设计源」。
- **影响:** 用户仅看 AGENTS.md 命令索引时,无法知道「Lanhu/Axure 是否被显式支持」,需要追到 skill.yaml 才知。
- **建议:** command.yaml 加一句「(支持 PRD/Lanhu/Axure)」,或在 AGENTS.md 命令索引下面加一条说明「`/case-draft` 自动识别 Lanhu/Axure 链接」(目前 AGENTS.md 第 13 行已有 silent dispatch 声明,但摘要里没有具体平台名)。

### D4 [正面] 术语对实际是「内部英文 + 外部中文」分层

- **证据:**
  - `case`(英文术语,内部 schema 字段)432 处 vs `用例`(中文术语,面向用户的文本)8 处
  - `schema`(英文,字段类型)108 处 vs `模式`(中文,日常词义 — 「有头模式」「静默模式」)14 处
  - `evidence` vs `证据` 同理
- 说明项目在「内部命名英文 / 外部 LLM 指令中文」上有清晰分工,**不构成混用**。

### D5 [正面] runtimes / runners 无输出文案语言混用

- **证据:** `grep -rnE '(error|failed|失败|错误)' .ai/core/runtimes .ai/core/runners` 命中均为文件路径(`error-fallback-paths.md`),不含实际输出文案。CLI 输出文案在 engine/src 内,不在本 audit 范围。

## E. 结构精简(.ai/core 内部冗余)

### E1 [P1] worker agent.yaml boilerplate 7 处完全相同

- **位置:** `.ai/core/agents/{bug-file,case-edit,case-hotfix,conflict-analyze,diff-scan,knowledge-curate,workspace-manage}-worker.agent.yaml`
- **证据:** `head -15` 这 7 个文件,从 `schema_ref:` 到 `forbidden_scope:` 的 13 行几乎逐字相同(`role: worker / runner: worktree_patch / write_capability: patch_only / allowed_tools: [read_file, write_patch, ask_user] / read_scope: [.ai/core/**, workspace/**] / write_scope: [workspace/**] / forbidden_scope: [.kata/repos/**]`)。
- **影响:** 增/改一条公共策略(如新增 read_scope)要在 7 个文件同步;漏一处即破例。
- **建议:** 抽 `.ai/core/agents/_base/worker.agent.yaml` 或在 `AgentContract@1` schema 中支持 `extends:` / `$base:` 字段;7 个 worker agent.yaml 仅保留差异字段。case-draft-worker 与 playwright-automation-worker 作为 base 的扩展。

### E2 [P1] agents `role:` 字段语义不一致

- **位置:**
  - 8 个 worker:`role: worker`(枚举值)
  - `playwright-automation-worker.agent.yaml:3`:`role: 执行 Playwright UI 自动化的归一化、规划、探测、生成、运行、归因和修复闭环。`(中文角色描述句)
  - `case-reviewer.agent.yaml:3`:`role: reviewer`(枚举值)
- **证据:** `grep '^role:' .ai/core/agents/*.agent.yaml`
- **影响:** 同一字段名在 9 个 yaml 中存放两种语义内容(枚举 vs 描述)。新人创建 agent 时不知该填枚举还是文字描述,且若有 schema 校验,可能误放过两种形式。
- **建议:** 一选一。(a)`role:` 仅取枚举值(`worker`/`reviewer`/`orchestrator`),给 playwright-automation-worker 加 `description:` 字段放角色描述;(b)`role:` 仅取自由文本,worker/reviewer 改名为更具描述性的句子。强烈建议 (a)。

### E3 [P2] contracts/{slug}/{slug}.golden.yaml 单文件目录嵌套冗余

- **位置:** `.ai/core/contracts/{automation-intent,case-evidence-map,confirmation-package,confirmation-question,coverage-matrix,historical-context,lanhu-snapshot,requirement-atom}/`
- **证据:** 8 个 contract 目录各只含 1 个 `{slug}.golden.yaml` 文件,`for c in .ai/core/contracts/*/; do ls "$c"; done` 验证
- **影响:** 目录层嵌套未承载任何信息;新人查 contract 内容需多一次 cd。
- **建议:** 平铺为 `.ai/core/contracts/{slug}.golden.yaml`(去掉目录);若未来需要 contract 多版本/变体,再升级回目录结构,届时也只在需要的 contract 升级。或当前结构留作未来扩展槽位(若是这个设计意图,在 README/AGENTS.md 注一句即可)。

### E4 [P2] case-draft-worker.agent.yaml allowed_tools 缺 ask_user

- **位置:** `.ai/core/agents/case-draft-worker.agent.yaml:7-9`
- **证据:** `allowed_tools: [read_file, write_patch]`(2 项),其他 7 个 worker agent 均含第 3 项 `ask_user`
- **影响:** case-draft skill 在 must_trigger_when 与 references 中多次出现「向用户追问」「BlockedEnvelope 回传主 agent」之类描述。若 worker 无 ask_user 是设计意图(由主 agent 而非 worker 问用户),应在文档显式说明;若是遗漏,worker 无法在执行中追问会触发 BlockedEnvelope 折返。
- **建议:** owner 确认。若设计意图,补一行注释 `# Subagent 不向用户提问,经由 BlockedEnvelope 回传主 agent`(skill.yaml:97 已声明此规则,这里补 inline 即可);若遗漏,加 `ask_user`。

### E5 [正面] 31 个 schemas required 字段集 100% 唯一

- **证据:** `for s in .ai/core/schemas/*.schema.json; do jq -r '.required // [] | join(",")' "$s"; done | sort | uniq -c | sort -rn` 显示每个 required 组合各出现 1 次,无重复。
- 说明 schemas 设计无可抽 base 的冗余模式。

### E6 [正面] prompt.yaml 9 个文件共用 10 个顶层字段

- **证据:** `grep -h '^[a-z_]*:' .ai/core/prompts/*.prompt.yaml | sort | uniq -c` 显示 schema_ref/rendering/prefill/output_schema/model_lock/locale/input_schema/hallucination_policy/fallback 9 字段每个出现 9 次。
- 说明 prompt contract 形式高度一致(model_routing 仅 8/9 出现,差异可接受)。这是契约层冗余,非内容冗余,设计合理。

## 附录:扫描覆盖清单

### 已扫文件数

- `.ai/core/skills/*/skill.yaml`:9
- `.ai/core/skills/*/references/*.md`:33
- `.ai/core/prompts/*.prompt.yaml`:9
- `.ai/core/commands/*.command.yaml`:9
- `.ai/core/agents/*.agent.yaml`:10(含 1 reviewer)
- `.ai/core/workflows/*.workflow.yaml`:9
- `.ai/core/schemas/*.schema.json`:31
- `.ai/core/contracts/*/`:8 个目录(各 1 golden.yaml)
- `.ai/core/{rules,guards,exceptions,imports,runners,source-refs,config,runtimes}/`:配套契约目录已 ls 验证
- `workspace/` 顶层项目目录:2(`dataAssets` / `xyzh`),features 二级 80 个

### cross-check 用到的命令

- `wc -l`、`grep -nE`、`find` 量化体量
- `grep -l` / `grep -c` 验证 reference 引用 / 规则密度
- `diff <(jq required)` 对照 schemas required 集
- `bun engine/bin/kata ai-core projection lock check` 验证源↔投影一致(通过)
- `awk` / `sed` / `shasum` 比对 INDEX.md 双投影一致性

### 跳过项

- `engine/src/**` — 明确不在范围(audit-only)
- `plugins/**`、`tools/**` — 明确不在范围
- 用户在 `workspace/{project}/` 中的产物内容(只看目录骨架,不读 `archive.md` / `manifest.json` 等)
- git 历史 / blame — 明确不在范围
- 安全维度(secret 泄漏 / CSRF / 路径越站)— 用户在 spec 中已显式排除

### 自查记录

- ✓ 无 TODO / 无 P3 / 无 "low" / 无「其他备注」
- ✓ P0+P1+P2 = 24 ≤ 60 上限
- ✓ 每条发现含「位置 / 证据 / 影响 / 建议」四字段
- ✓ 每条证据可由一条 grep / wc / find 在本地复现
- ✓ A-E 五维度均有发现条目或显式「无发现」(D 维度仅 3 条 P2,但有显式条目;无空章节)
