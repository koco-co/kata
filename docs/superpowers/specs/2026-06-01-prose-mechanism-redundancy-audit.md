# .claude 提示词「prose 代偿机制」审计

> 只读审计产出，供拍板用；本文件不改任何 prompt。动手改走 worktree。
> 日期：2026-06-01。承接「.claude 去黑话重写」之后的第二类问题。

## 执行期更正（2026-06-01 实施后回填）

本审计有一处**事实错误**，执行期实测后更正，记录在此（原文各节保留以存推理过程）：

- **§1.3 / §4 ②-1 错判「无 lint 校验 feature 目录名 / `metadata.yaml#id`」。** 实际 `runFeaturesLint`（`.claude/scripts/_shared/cli/features-lint.ts`）早已校验两者：`SLUG_RE`（与 `lib/features/slug.ts` 完全一致）→ `dir_name_invalid`；`meta.id !== name` → `id_dir_mismatch`。且已挂进 `cases-lint.ts`（`lint:cases`，fail severity），并有 `features-lint.test.ts` / `metadata-gate.test.ts` / `manifest-gate.test.ts` 覆盖。**②-1 无需新增 lint**；用户点名的「禁止自行拼接」已由该守卫在 verify 时兜底，故直接删祈求语（已落地）。
- **该守卫不在 `ci`。** `lint:cases` 未进 `package.json` 的 `ci` 脚本，故守卫靠「改后即测」纪律 / 手动跑，非 CI 阻断。
- **接 `ci` 被存量阻塞。** 实跑 `kata cases lint --severity fail-only --scope workspace` = **541 条 fail**（106 `dir_name_invalid` + 134 `session_compliant` + 40 `manifest_schema_invalid` + …），直接接 ci 会全红。
- **两套冲突的命名约定。** `workspace/dataAssets/features/` 用中文 `【v…】【module】description`（`naming-convention.md` 文档化约定，`metadata.id` 亦为中文且 = 目录名）；`workspace/xyzh/` 用 ASCII `yyyy-mm-slug`（守卫 + 5 个 schema + `features-resolve` 只认这种）。守卫把 53 个合法中文目录全判 `dir_name_invalid`。用户拍板「支持中文」→ 作为**独立 contract 任务**放宽 5 schema（FeatureMetadata/FeatureManifest/CaseCorrections/PlaywrightAutomationHandoff/FeatureSourceSnapshot）+ 2 regex，不在本轮。

**本轮（prose-mech worktree）实际落地**：① case-draft 删 feature 路径祈求语 + 去重（A1）；② 挂 `pre-edit-guard` / `pre-bash-guard` 进 committed `.claude/settings.json` + 测试 + INSTALL（②′）；③ repo-readonly 末行改引真实 hook；④ case-draft 删 1 处 lint 已兜的 SourceRef 泄漏说理（①-2 安全子集）。**未做**：①-3 playwright 跨 phase 弱断言去重——按 round-1 已定 P0 教训（phase 隔离阅读，跨 phase 删说理 = 语义回退）DROP；其唯一候选 intra-SKILL 切口经核实 `lintWeakAssertion` 只窄覆盖 `.toBeTruthy()` / `.filter(Boolean)`（warn 级），说理非冗余、保留。①-2 全树 43 处「——」中其余 41 处为隔离阅读 point-of-use / 规则定义 / 示例 / 无机制兜底的判断说明，删之即 P0 回退，保留。

## 0. 这份审计回答什么

用户的批评（一针见血）：**有些 prose 是在「指望大模型遵守」一条本可由工具确定性保证的约束——既啰嗦，又用错了机制。**

例（case-draft/SKILL.md）：

- L27：`…取返回的 featureDir 作为所有产物唯一写入根，featureId 写 metadata.yaml#id。禁止自行拼接 feature 目录路径。`
- L44：`所有产物写入 kata features resolve 返回的 featureDir；自行拼接 feature 路径视为未完成——版本号/slug 由引擎决定，手拼会偏离唯一目录。`

本审计：把全 `.claude` 提示词里的命令式约束，对照**真实机制层**（hook + lint + CLI 校验器），分成三桶——①直接砍 / ②补一条守卫就能砍掉「指望」/ ③无法机制化只能保留。

## 1. 机制层现状（先摸清「到底什么被确定性保证了」）

### 1.1 已生效：lint（验收时检测，经 `check:*` / `lint:*` 脚本与「改后即测」跑）

| CLI 入口 | 确定性拒绝什么 |
| --- | --- |
| `kata skills sync-check`（`check:skills`） | SKILL.md 结构、frontmatter 白名单、行数上限；`.claude`↔`.agents` 同步；runtime detach |
| `kata cases lint`（`lint:cases`） | SourceRef 泄漏进用例展示文本；trace 头；archive QA；debug 文件命名 / no-debug；handoff 双轨头；硬编码路径；feature 目录内禁 helper；owner 去重；SourceRef registry 一致性；**弱断言**；**v2 门禁**：env profile 合规 / session storageState 合规 / runner 是 aggregator / spec 结构 / cases 落 cases 目录 / 禁 `.env.local` / 禁悬空 helper |
| `kata paths audit`（`lint:paths`） | 硬编码路径（E1-PATH）；陈旧目录布局（P-S2/P-S3） |
| `kata agents audit`（`lint:agents`） | agent 文件命名 / shape |

**这层比预想厚**：playwright 一大批重 prose（env profile、禁 named session/state-save、runner-aggregator、弱断言/表面通过、spec 结构）**已被 `kata cases lint` 强制**，且 §10-quality-gate.md 自带一张表把规则映射到 lint 文件。

### 1.2 存在但**未挂载**：hook（文件在、有测试，但没接进任何 settings → 当前不拦任何东西）

| hook | 设计意图 | 现状 |
| --- | --- | --- |
| `pre-edit-guard.ts` | 拦截写入 `.kata/repos/` 源仓库 | **未挂载**：全局 `~/.claude/settings.json` 的 PreToolUse 只挂了 vibe-island 通知桥；项目无 committed `settings.json`，`settings.local.json` 无 hooks 键；INSTALL/docs 无挂载说明 |
| `pre-bash-guard.ts` | 拦截 `rm -rf workspace/`、`rm -rf /`、push 到 repos | 同上，**未挂载** |
| `post-edit-debug-naming.ts` / `post-edit-md-link.ts` | debug 命名 / 坏链接告警 | 仅告警（exit 0），且未挂载 |
| `post-edit-format.ts` | 自动 biome/prettier 格式化 | 未挂载 |

**结论**：所有「repos 只读」「禁 rm -rf workspace」类约束，**当前只靠 prose**——对应的 guard 是现成的死代码。

### 1.3 完全未机制化（无 hook 无 lint）

- feature 目录路径必须来自 `kata features resolve`：**无任何 lint 校验目录名文法或 `metadata.yaml#id` 一致性**（`path-treatment` 显式排除 `/workspace/`）。← 用户举的例子落这里。
- 「首步先调用 kata features resolve」这类**调用时序**：prose 无法被机制强制（Claude Code 不能用 prose 逼出一次 CLI 调用）。
- 判断 / 语气 / 阶段顺序类约束。

## 2. 核心模型：两个执行时刻（决定一条 prose 能不能砍）

| | 生效时刻 | 谁在生效 | 作用 |
| --- | --- | --- | --- |
| **生成时** | 模型读 prompt 产出 | prose 指令 | 预防（让模型一次做对） |
| **验收时** | 跑 lint / hook | 机制层 | 检测 / 拦截（事后兜） |

**关键约束（上一轮 P0 教训）**：playwright 的 phase 是**隔离阅读**——§6 的 agent 不读 §10 的 lint 映射表、也未必跑 lint。所以**「lint 覆盖了」≠「§6 那条 prose 多余」**：lint 是事后检测，agent 需要生成时就知道规则。

**因此真正可砍的，只有这三种「冗余」，而不是「凡 lint 覆盖就砍」**：

- **R1 重复**：同一规则在一起读的材料里说了 ≥2 遍（如 case-draft L27/L44 同文件）。
- **R2 说理赘述**：规则 + lint 已保证后果时，「否则…会偏离…」「等于把红跑伪装绿跑」这类讲解（全树 46 处）。保留规则本身，砍掉说教。
- **R3 把「指望」换成守卫**：补一条验收守卫后，「禁止自行拼接…」这种祈求式禁令语就多余了——守卫确定性拒绝，无需「指望」。生成时指令（用 resolve 的 featureDir）保留，祈求语删除。

**反过来——不可砍**：隔离阅读材料里、生成时唯一的 point-of-use 指令，即使另有 lint 兜底（防御纵深，非冗余）。

## 3. Bucket ①：直接砍（R1 重复 / R2 说理赘述）

零代码改动，只删文字。典型条目：

| # | 位置 | 问题 | 改法 |
| --- | --- | --- | --- |
| ①-1 | case-draft/SKILL.md L27 + L44（+ 第 3 处） | **R1**：feature 路径规则同文件说 3 遍 | 合成一句留在硬规则段；workflow 段只留「写入 `kata features resolve` 返回的 featureDir」一句指针 |
| ①-2 | 全树 46 处「否则/会导致/等于把/会偏离/——」 | **R2**：规则后挂一段后果讲解，而后果已由 lint 或上下文保证 | 留规则，删讲解。如 SKILL.md L44「——版本号/slug 由引擎决定，手拼会偏离唯一目录」整段删 |
| ①-3 | playwright 弱断言/表面通过散落 §1/§3/§5/§6 + 2 个 reviewer + cli-essentials | 规则本身要留（隔离阅读），但**重复的「会把红跑伪装绿跑」类说理**可去重为一处定义 | 在 SKILL.md 留一处定义，phase 内引「见 SKILL 弱断言定义」而非各自展开说理 |
| ①-4 | infra-diagnose/diagnostic-playbook.md（7 处说理） | **R2** 集中区 | 同 ①-2 |

> 注：①-3 必须守住隔离阅读——只去重「说理」，不删 phase 内的 point-of-use 规则句本身。

## 4. Bucket ②：补一条守卫，再砍掉「指望」

机器可校验、但当前**无任何 lint/hook**，所以 prose 是唯一约束。补一条校验器后，祈求式禁令语即可删。

| # | 约束 | 现状 | 提议守卫（≈1 条 lint 规则） | 砍掉的 prose |
| --- | --- | --- | --- | --- |
| ②-1（flagship） | feature 目录名必须来自 resolve 文法、且 `= metadata.yaml#id` | 无校验（`path-treatment` 排除 `/workspace/`） | 在 `kata cases lint` 加一条：扫 `workspace/*/features/*`，目录名须匹配 `^\d{4}-\d{2}-<slug>$` 且等于该目录 `metadata.yaml#id`，否则 fail | 删「禁止自行拼接 feature 目录路径」「自行拼接视为未完成」等祈求语；保留「写入 resolve 返回的 featureDir」指令 |

> 说清：守卫是**验收时**拒绝，仍砍不掉「先调用 resolve」这条生成时指令（机制无法逼出 CLI 调用）。能砍的是「禁止…否则…」的祈求部分——有守卫就不用「指望」。
> ②类目前确证仅此 flagship；执行阶段按文件再扫，发现新候选追加，不静默扩面。

## 5. Bucket ②′：把已存在但未挂载的 hook 挂上（高杠杆）

`pre-edit-guard` / `pre-bash-guard` 是**现成代码**，只差挂载。挂上后这些约束从「prose 指望」变成「写入即拦」：

| 约束 | 现成 hook | 挂载后可砍的 prose |
| --- | --- | --- |
| repos 只读（不得写/push/mv/rm 源仓库） | `pre-edit-guard`（写入拦截）+ `pre-bash-guard`（push 拦截） | rules/repo-readonly.md、git-workflow.md、workspace-boundary.md 里反复重申的「只读/不得 push」可大幅收敛为一句「由 pre-*-guard 拦截」 |
| 禁 `rm -rf workspace/` | `pre-bash-guard` | 相关告诫语 |

> 挂载 = 改 `.claude/settings.json`（项目级提交）+ INSTALL.md 写挂载步骤 + 补「挂载存在性」测试。属代码/配置变更，走 worktree。
> 风险点：hook 仅对 Claude Code 的 Edit/Write/Bash 生效，命令行直接操作不受约束——所以 prose 不能 100% 删，保留一句声明即可。

## 6. Bucket ③：无法机制化，保留但精简（396 行命令式约束的大头）

判断 / 阶段时序 / 语气类，机器无法校验，**只去赘述不砍规则**：

- 时序：「先 X 再 Y」「前序未过不进入」「遇阻不直接问用户」——保留，措辞可平实化。
- 判断：「多候选无法消歧时才问用户」「默认推荐项置顶」——保留。
- 语气 / 黑话：这批与「去黑话」任务重叠，归那条线处理，不在本审计重复。

## 7. 给你拍板的决策点

1. **②′ 挂 hook 要不要做？** 这是把「repos 只读」从纸面变成真拦截的唯一办法，但要动 `settings.json` + INSTALL + 测试。
2. **②-1 守卫要不要补？** 补了才能名正言顺删用户点名的那句「禁止自行拼接」。
3. **①类（纯删字）** 默认就做，无代码风险——除非你要先看逐条 diff。

执行顺序建议：先 ①（零风险删字）→ 再 ②/②′（按你 1、2 的决定补守卫/挂 hook）→ 守卫就位后回头砍对应祈求语。全程 worktree，改后跑 `check:skills` + `bun test` + 相关 lint。

