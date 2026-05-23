# 跨模型稳定产物 — case-draft 试点 — 设计

- 日期：2026-05-23
- 试点 Skill：`case-draft@1`
- 试点项目：`workspace/dataAssets`
- 状态：已与用户对齐，待复核

## 1. 背景与问题

kata 的 skill 编排工作流在**切换运行时/模型(claude+opus vs codex+gpt)后产出不稳定**：同一项目、同一需求源，不同模型产出的产物在**内容、结构、文件位置/路径**上都不一致。

用户最初想用根目录 `progress.json`(一个手工维护的 34 任务追踪 JSON)来「覆盖并确认所有 skill 的产出物」——校验格式、内容，以及**该参考的输入有没有都参考到**(case-draft 不只看手贴的 Lanhu，还应参考知识库与源码)。但它是手工维护、计数易漂移、两 runtime 写法不一(claude 用 `TaskCreate`、codex 用 `update_plan`)、子 agent 还碰不到它，**没能在不同模型下自动、一致地反映真实进度与产物质量**。

### 已确认的根因(分歧从哪来)

经探查 `.ai/core/`,跨模型不稳定有四个具体来源：

1. **`codex_override` 改变产出**：每个 `skill.yaml` 里的 `codex_override` 为 codex 简化了 routing 与 hard_rules。case-draft 上最激进——claude 版走完整的 `execution-protocol`(TodoWrite 编排 + Worker 派发 + 二阶段审查),codex 版只是「串联」步骤、砍掉 Worker 与多数审查。**同一 skill 两 runtime 走不同步骤集、不同审查强度,产出自然不同。**
2. **路径由模型自取**:happy-path 的 feature 目录 slug 由模型自由生成(`YYYY-MM-english-slug`),不同模型取名不同 → 路径就不同。仅在异常时才有 `unresolved-{module}-{8-hex}` 兜底。
3. **校验是 advisory、不强制**:两 runtime 的 `structured_output` 都是 `advisory`/post-hoc(claude `no_structured_output_enforcement`、codex 后处理解析),schema 不在生成时强制。实证:`workspace/xyzh/features/2026-04-dq-overview/manifest.json` 的 `requirement_atoms: []` 为空、`coverage_matrix_path: null`,却标 `status: completed`——空证据层蒙混过关。
4. **输入不完整且不确定**:case-draft 应消费 需求源 + 知识库 + 源码 + 历史 archive,但实际是否消费、消费多少取决于模型;`.kata/repos` 源码是否被引用没有任何强制。

## 2. 目标

1. 让 case-draft 在 claude 与 codex 下产出**稳定产物**:
   - **路径/位置逐字符一致**(可机器断言);
   - **结构/schema 一致**(字段、文件集合、序列化顺序,可 schema 强校验);
   - **内容语义等价**(以源事实覆盖集为准,带容忍阈值)——次要、尽力目标。
2. 产物**完整**:确定性地消费 需求源 + 知识库 + 源码 + 历史 archive,并能机器证明已消费。
3. 提供 **e2e** 证明:同一输入在两 runtime 真跑,断言路径一致 + schema 通过 + 输入完整 + 覆盖达标。
4. 用可执行的**校验报告**承接 `progress.json` 本想做的「覆盖/确认产物」能力。
5. **验证一套可复用方法论**(契约统一 + 引擎确定性 + 三层校验门 + 跨模型比对 + e2e),为后续推广到其余 skill 打模板。

## 3. 范围决策(已与用户确认)

| 决策点 | 结论 |
|---|---|
| 范围 | **先打通一个 skill(case-draft)端到端**,验证方法论后再推广;其余 9 个 skill 本次不做。 |
| 稳定维度 | **路径一致 + 结构/schema 一致**为硬骨架;**语义等价**为次要(带阈值);**逐字节一致**明确不追求。 |
| `progress.json` | 由 `kata cases verify` 的 per-artifact 审计报告承接其能力;**仓库级 `progress.json` 退出本次范围**(已全完成的一次性追踪)。 |
| `codex_override` | **统一为单一规范工作流**:删除/收敛会改变产出的差异,两 runtime 跑同一套步骤与审查;仅保留不影响产出的机制替换。 |
| 路径决定权 | **引擎确定性计算** `feature_id`:用户给优先 → 非模型字段派生 → hex 兜底;模型不染指命名。 |
| 校验门强度 | **硬校验门**:产物不符即判定 skill 未完成,必须修复。 |
| 校验门深度 | **三层**:① schema 结构 ② 输入消费证明 ③ 内容质量(确定性规则)。 |
| 判定机制 | **规则/结构派生(确定性)**;不用 LLM-judge(自身跨模型漂移会污染稳定性判定)。 |
| 语义比对键 | **source_ref / 源事实覆盖集**;不比 prose、不比模型自取的 atom 文本。 |
| 验收阈值 | **关键源事实(blocking/critical)100% 一致,否则 FAIL**;其余 Jaccard < 阈值(默认 0.9,可配)→ **WARN 不阻断**;路径不一致 → FAIL。 |
| 试点项目 | **dataAssets**(repos 已克隆多个源码、有知识库)。 |
| 需求源 | **Lanhu URL**(贴近真实);e2e 用快照固定。 |
| 源码输入 | 每次触发 **AskUser 确认 `group/projectname/branch`**;`.kata/repos` 有则带推荐项、无则索要。 |
| 源码推荐来源 | **知识库登记「开发版本→仓库+分支」映射** + LLM 语义兜底 + 人工确认。 |
| e2e 输入固定 | **抓一次 Lanhu → 冻成 source_snapshot fixture → 两 runtime 共用**(隔离抓取分歧)。 |
| e2e 运行方式 | **按需脚本 + 稳定性报告**;CI 里放用 fixture 的轻量回归,不挂每次提交的真跑门禁。 |
| 交付物 | **四件套全做**:引擎命令 + case-draft 契约重构 + e2e harness + 重渲染 projection。 |

## 4. 总体架构

```
Lanhu URL ──┐
知识库 ──────┤   ① 确定性输入装配(引擎)              ② case-draft 统一工作流(模型)
源码 triple ─┼─▶ source_snapshot + feature_id ───────▶ enhanced / confirmation-package /
历史 archive ┘    (AskUser 确认源码,引擎算路径)         archive / cases.xmind / manifest
                                                          落到引擎指定的固定路径
                                                              │
                          ④ 跨模型 e2e(harness)              ▼
                          claude(headless) / codex exec ◀── ③ kata cases verify(三层硬门)
                          各跑一次同一 fixture                 不过 = 退出码非零 = skill 未完成
                              │                                   │
                              └──▶ kata cases compare ◀───────────┘
                                   源事实覆盖集 + 路径一致断言 → 稳定性报告
```

四个部件:**契约(源头治理)**、**确定性输入装配(引擎)**、**三层校验门(引擎)**、**跨模型比对与 e2e harness**(部件四含两个模块:`kata cases compare` 见第 8 节、e2e harness 见第 9 节)。

## 5. 部件一:case-draft 契约重构(源头治理)

改 `.ai/core/skills/case-draft/skill.yaml` 与对应 `references/`,改完 `kata ai-core projection render` 重渲染到 `.claude/` 与 `.agents/`。

1. **统一 `codex_override`**:删除会改变产出的差异(routing_summary、hard_rules 的步骤集与审查强度),让两 runtime 执行**同一套规范工作流**。仅当 runtime 能力确实受限时(如 codex `mcp:false`)允许**机制层**等价替换,且替换不得改变产出契约。`codex_override` 仅保留「能力适配」类条目,不再承载步骤差异。

   **5.1 execution-protocol 等效(迁移成本提示)**:claude 版走完整 `execution-protocol`(TodoWrite 编排 + Worker 派发 + 二阶段审查),codex 版当前是纯串联。统一后 **codex 侧也须执行 `execution-protocol` 的等效步骤,机制替换不改变产出顺序与审查强度**——即用 codex 等效原语承载同一编排:`TodoWrite → update_plan`、`Worker 派发 → spawn_agent/send_input/wait_agent`、二阶段审查(spec-reviewer + quality-reviewer)在 codex 侧同样跑满。这部分是本次**主要工程量**,不应低估:`references/execution-protocol.md`、`worker-prompt.md`、两个 reviewer prompt 需做成 runtime-中立、由 projection 在 codex 侧渲染出可执行的等效编排。
2. **新增「源码确认」步骤**(在 `module-identify` 产出**已稳定的 module/project 上下文之后**触发,`historical-context` 之前;实现上以 module-identify 返回稳定上下文为前置条件):
   - **一轮 AskUser 一次性确认前端 + 后端多仓库**的 `group / projectname / branch`,交互形如:
     > 请确认该功能涉及的前端和后端 GitHub 仓库:
     > 前端: `customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc`
     > 后端: `customltem/dt-center-assets@release_6.3.x_ltqc`
   - 推荐项来源:① 优先查**知识库登记的「开发版本→仓库+分支」映射**(由 Lanhu/Axure PRD 里的「开发版本」关键词命中,如 `6.3岚图定制化分支` → 上面两仓库);② 未登记则 LLM 语义兜底;③ 无论哪种都过这一轮 AskUser 人工确认。
   - `.kata/repos` 已有该仓库则带推荐项;缺失则索要(给出 clone 指引或阻塞为待办)。
   - 确认结果写入 `metadata.yaml`(确定性输入记录),并纳入 source_snapshot。
3. **引擎计算 feature_id**:工作流不再让模型取 slug,改为调 `kata features resolve`(见部件二)拿到固定 `feature_id` 与目录,模型只往既定路径写。
4. **显式声明 `required_inputs`**:在 `skill.yaml` 增加 required 输入类别(`prd|lanhu` / `knowledge` / `source_code` / `history`),供校验门 L2 据此判定「输入消费证明」。
5. **收紧 output schema**:修订 `FeatureManifest` 等 schema,堵住空证据层——例如 `case_drafting.status == completed` 时强制 `requirement_atoms` 非空、每个 atom 至少一个 `source_ref`、`coverage_matrix_path` 非空。

## 6. 部件二:确定性输入装配(引擎)

新增/扩展 `kata features resolve`(或并入现有 `kata features new`):

- 输入:`project`、可选 `slug`、源信息(Lanhu pageId / PRD 文件名等**非模型字段**)、`module`(**由工作流传入——`module-identify` 阶段的产出**;此时 `metadata.yaml` 尚未生成,module 是 resolve 的输入,而非从 `metadata.yaml` 读取)。
- 路径推导优先级:**① 用户显式 `slug` → ② 从非模型字段确定性派生(slugify) → ③ hex 兜底**。
- 输出:固定 `feature_id`(符合 `^\d{4}-\d{2}-...$`)与绝对目录路径;同 `(project, slug 来源)` 输入**幂等**——目录已存在且匹配当前输入来源则**返回已有路径**(复用,不新建)。
- 冲突规则:**仅当 `(project, slug)` 已存在但来自不同源**(不同来源巧合算出相同路径)时,追加确定性后缀(`-2`、`-3`),与现有 `2026-04-data-catalog-mgmt-2` 命名一致。

source_snapshot 装配:把已确认的源码 triple、知识库相关条目、Lanhu 抓取内容、历史 archive 引用聚合为一个 snapshot 描述,供工作流消费、供 e2e 冻结为 fixture。

**路径传递机制**:引擎算出的 `feature_id` 与目录路径写入 `source_snapshot`(并落 `metadata.yaml`),工作流各步骤一律从**这同一来源读取**既定路径,**不在提示词中重新拼接/计算**——废除现 routing_summary 里 `workspace/{project}/features/{YYYY-MM-english-slug}/` 这类由模型运行时实时拼接的路径模板。

## 7. 部件三:三层硬校验门 — `kata cases verify`

在现有 `kata cases lint`(`package.json` 已有 `lint:cases`)基础上扩展为三层门,产出 per-artifact 审计报告;失败退出码非零,skill 收尾**必须调用且必须通过**。

- **L1 结构/schema**:产物文件集合齐全;字段、序列化顺序符合 schema;`archive.md`/`cases.xmind` 人类可读层**无 SourceRef 泄漏**(SR-、csv::、SourceRef 字符串只许在结构化层)。
- **L2 输入消费证明**(最有价值的一层):
  - 源码 triple 已确认且记录在 `metadata.yaml`;
  - source_snapshot 含知识库 + 源码 + 需求源 + 历史(按 `required_inputs`);
  - `manifest.json#case_drafting.requirement_atoms` 的 `source_ref` **跨越所有 required 输入类别**(不能只挂 Lanhu),即存在 kind 为 `knowledge` / `source_code` 的引用。
  - **可追溯性怎么判定**(L2 的硬核):每个 `source_ref` 的 ID 必须**解析到真实存在的目标**,否则判 FAIL——
    - `kind=knowledge` → ID 能在 `workspace/{project}/_shared/knowledge/**` 下 find 到对应条目(文件或锚点);
    - `kind=source_code` → 引用形如 `{repo}@{branch}:{path}[:{line}]`,`{repo}` 须是本轮已确认的 triple 之一,且 `{path}` 在 `.kata/repos/**` 对应仓库中存在;
    - `kind=lanhu`/`prd` → token/锚点能在冻结的 source_snapshot 中定位。
  - 即:L2 不只看「有没有挂引用」,而是看「引用**指得回**真实输入」。
- **L3 内容质量(确定性规则)**:每条用例有步骤 + 预期;每条用例可追溯到 ≥1 个 `requirement_atom`(`case_id` ↔ `requirement_atom_ids` 对账);覆盖矩阵无空洞;标题非空且无冗余前缀残留。
- 失败输出**可执行修复清单**:哪一层、哪个文件、哪个字段、缺哪类输入。

## 8. 部件四:跨模型比对 — `kata cases compare`

输入两份产物目录(claude 跑出的 + codex 跑出的),输出稳定性报告:

- **路径断言**:两目录 `feature_id`、文件集合逐字符一致。
- **源事实覆盖集**:从两份 `manifest` 各自抽取所有 `source_ref` 指向的源事实(Lanhu token / PRD 锚点 / 源码位置 / 知识条目),归一化为集合。
- **判定与严重级**(区分 FAIL 与 WARN,给人工裁量空间):
  - 关键源事实(blocking/critical 需求点)缺失/不一致 → **FAIL**(退出码非零、阻断);
  - 其余源事实 Jaccard < 阈值(默认 0.9,可配)→ **WARN**(报告标注、不阻断,留人工裁量);
  - 路径不一致 → **FAIL**。
- 报告列出:每条差异的严重级(FAIL/WARN)、缺失/多出的源事实、路径差异、各层 verify 结果。「阈值第一次触碰」即首次低于 0.9 时,只 WARN 不 FAIL。

## 9. e2e harness(按需脚本 + 稳定性报告)

- **fixture 制备**:试点前对选定 Lanhu URL 抓一次,把 source_snapshot(含确认过的源码 triple + 知识快照 + Lanhu 内容)冻成受版本控制的 fixture。两 runtime 消费**同一份**,隔离「抓取分歧」。
- **双 runtime 真跑**:
  - claude:headless 调用 case-draft;
  - codex:`codex exec` 非交互调用;
  - **外层 wrapper 区分两 runtime**(因引擎路径确定性一致,两边 `feature_id` 逐字符相同,直接写会互相覆盖):落到 `workspace/{project}/features/` **之外**的 `e2e-results/{run-id}/{claude|codex}/.../features/{feature_id}/`。两 runtime 各自独立产出、互不覆盖;`compare` 读这两个外层目录做比对,断言其内部 `feature_id` 一致。
- **断言**:① 两目录路径一致;② 各自 `kata cases verify` 三层全过;③ `kata cases compare` **无 FAIL**(关键源事实 100% 一致、路径一致;其余源事实 < 0.9 只产生 WARN,不致 e2e 失败)。
- **运行方式**:专门命令(如 `kata cases e2e` 或 `scripts/` 脚本),用户按需手动跑;CI 里放一个**用录制 fixture 的轻量回归**(只验 verify/compare 逻辑,不真跑模型)。

## 10. 错误处理与降级

- 复用 `references/error-fallback-paths.md`:Lanhu 抓取失败 → 阻塞草稿(`archive.draft.md` + `unresolved-summary.md`);源码缺失 → AskUser 索要或阻塞为待办;子 agent 阻塞 → `BlockedEnvelope` 回主 agent,不直接问用户。
- `verify` 失败 → 不静默通过,给修复清单;skill 视为未完成。
- 路径冲突 → 确定性后缀,不覆盖既有产物。

## 11. progress.json 处置

- 仓库级 `progress.json` **退出本次范围**,不再手工维护其「产物覆盖/确认」职能。
- 该职能由 `kata cases verify` 的 per-artifact 审计报告承接——可执行、自动、跨模型一致。

## 12. 范围边界(YAGNI)

- **只做 case-draft 一个 skill 端到端**。
- 其余 9 个 skill(case-edit、case-hotfix、bug-file、conflict-analyze、diff-scan、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage)在方法论被 e2e 证明后,用同一模板(契约统一 + verify + compare + e2e)逐个推广——**本次不做**。
- 不引入 LLM-judge、不做 CI 每次提交真跑门禁、不重构 `progress.json`。

## 13. 待用户提供的输入(异步,不阻塞设计)

1. 试点的真实 Lanhu URL(或确认用 `2026-02-lt-dq-rule-set-per-table` 的原始 URL)。
2. 2–3 个已知的 case-draft 产物毛病实例(格式 / 内容 / 漏看知识库或源码)——校验规则 ground truth。
3. 已知的「开发版本 → 前后端仓库+分支」映射(已有一条:`6.3岚图定制化分支` → 前端 `dt-insight-studio` + 后端 `dt-center-assets@release_6.3.x_ltqc`)。

## 14. 验收标准(Definition of Done)

1. `.ai/core` case-draft 契约统一(`codex_override` 不再改变产出),`kata ai-core projection render` 重渲染、`bun run lint:ai-core` 通过。
2. `kata features resolve` 确定性计算路径,单测覆盖三级优先级 + 冲突后缀 + 幂等。
3. `kata cases verify` 三层门可用,单测覆盖每层的过/不过用例;空证据层(如 `requirement_atoms: []`)被 L2 拦截。
4. `kata cases compare` 输出稳定性报告,区分 **FAIL/WARN**:**关键源事实不达标 → FAIL;其余 < 0.9 → WARN**(不阻断);路径不一致 → FAIL。单测覆盖覆盖集比对、阈值判定与严重级分流。
5. e2e:选定 Lanhu fixture 在 claude 与 codex 各跑一次,**路径一致 + 两边 verify 全过 + compare 无 FAIL**(关键 100%;其余 < 0.9 仅 WARN)。
6. CI 轻量回归(fixture)纳入 `bun run ci`。
7. 仓库级 `progress.json` 的产物覆盖职能由审计报告承接。
