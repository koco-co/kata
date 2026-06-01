# 去黑话重写 · 全量审计清单（Phase 2 · ⛔ 审查闸门）

> 本清单是审查闸门。**A 类机械替换**可直接执行；**B 类忠实度定调、description 改动、冗余规则删除**须经用户逐项点头后才进 Phase 3（Task 5+）。判断偏保守：吃不准标「需用户定」。

基线：worktree HEAD `acdef91e2`，提示词文件尚未改动。命中复核（In 范围，已排除第三方 `plugins/lanhu`）：A 类 34 处、B 类 10 处。

---

## 1. A 类黑话 — 可 1:1 机械替换（可 grep 清零）

逐处替换，无需用户逐条审（替换词已定，验收 = grep 命中归零）。

| 文件:行 | 词 | 拟改 |
|---|---|---|
| case-draft/fewshots/case-format-sample.md:6 | 对齐 | 即可掌握所有要点 |
| case-edit/references/fewshots/case-format-sample.md:6 | 对齐 | 同上（与 case-draft 副本一致） |
| infra-diagnose/SKILL.md:12 | 沉淀回知识库 | 写回知识库 |
| infra-diagnose/SKILL.md:33 | 收尾沉淀时 | 收尾记录时 |
| infra-diagnose/references/knowledge-format.md:1 | 收尾沉淀（标题） | 收尾记录 |
| infra-diagnose/references/knowledge-format.md:3 | 知识沉淀在本地 | 知识记录在本地 |
| infra-diagnose/references/knowledge-format.md:15 | ## 排查后：沉淀 | ## 排查后：记录 |
| infra-diagnose/references/ssh-protocol.md:7 | 已沉淀的 | 已记录的 |
| knowledge-curate/SKILL.md:12 | 沉淀到 | 记录到 |
| knowledge-curate/SKILL.md:30 | 与沉淀流程 | 与记录流程 |
| knowledge-curate/references/knowledge-rules.md:5 | 沉淀为业务知识 | 记录为业务知识 |
| playwright/SKILL.md:73 | surface 契约测试 | 只测页面表层不测业务结果 |
| playwright/phases/§1-case-normalize.md:104,106 | surface 契约测试 / surface 断言假通过 | 只测页面表层… / 表面通过 |
| playwright/phases/§3-ui-plan.md:20 | 收敛为 / surface runner / surface 断言 | 缩小为 / 表层 runner / 弱断言 |
| playwright/phases/§3-ui-plan.md:29,31,44 | UI 知识沉淀 / 沉淀入 / 沉淀为 | …记录 / 记录入 / 记录为 |
| playwright/phases/§4-ui-probe.md:77 | 沉淀知识 | 记录知识 |
| playwright/phases/§6-playwright-generate.md:11,66,68,186,188 | UI 知识沉淀 / surface×2 / 沉淀×2 | 记录 / 表层·表面通过 / 记录 |
| playwright/phases/§9-repair-loop.md:77 | 业务规则漂移 / 产品漂移 | 业务规则变了 / 产品行为变了 |
| playwright/phases/§12-case-feedback.md:33 | 文案漂移 | 文案变了（字段 id `ui_text_drift` 保留） |
| playwright/prompts/agent-quality-reviewer.md:32,34 | surface 契约测试 / surface 断言假通过 | 只测页面表层… / 表面通过 |
| playwright/references/cli-essentials.md:55,79 | locator 锚点 / 锚点优先级 | locator 首选 / 定位点优先级（locator 保留） |
| playwright/references/cli-essentials.md:110 | surface 假通过 | 表面通过 |

---

## 2. B 类黑话 — 需用户定调（⚠ 高频核心术语）

| 文件:行 | 词 | 处理 | 需用户定 |
|---|---|---|---|
| playwright SKILL.md:13、prompts/agent-quality-reviewer.md:36 | 闭环（修复闭环） | 凑词，删：「运行归因与修复」「### 修复」 | 低风险，建议直接删字 |
| playwright SKILL.md:71/72、§6:9/60、prompts/agent-quality-reviewer.md:26、references/cli-essentials.md:181、§1:104、§3:20、§6:34（共 8-9 处「覆盖忠实度/忠实自动化/忠实覆盖/忠实实现」） | **忠实度** | ⚠ **跨 8-9 处的核心质量术语，必须先定一个全局统一替换词，再全树一致替换** | **需你拍板替换词** |

**「忠实度」候选替换词（请选一，或给你的）：**
- A（推荐）「步骤与断言的真实性」/ 动词化「真实实现/真实断言」——贴 spec §5.3 示例，直白。
- B 保留「覆盖忠实度」作为已约定的项目术语（白名单化，不算黑话）——若你认为团队已习惯该词。
- C 「不偷工」式口语——过于随意，不建议。

定调后该术语在 SKILL.md + 6 phases + prompts + references 全树统一，且关键禁令补「为什么」（surface 测试证明不了业务结果正确）。

---

## 3. description 改动（单列单审 · 爆炸半径最大）

| 技能 | 行 | 改动 | 触发风险 |
|---|---|---|---|
| infra-diagnose | SKILL.md:3 | 「并沉淀凭据与排查知识」→「并记录凭据与排查知识」 | 「沉淀」非触发词；改后 149→约 149 字符，远 < 1536；触发词（JDBC/No route to host/SSH/连接超时）不受影响 |
| knowledge-curate | SKILL.md:3 | 「统一沉淀于 _shared/knowledge/」→「统一记录于 _shared/knowledge/」 | 同上；触发短语「记一下这个规则/XX 术语什么意思/更新模块知识」原样保留 |

其余 6 技能 description 不含 A/B 黑话，不改。

---

## 4. 冗余 / 未验证规则（拟删 / 拟合并 · 全部待你拍板）

只读审计 case-draft + playwright-automation 全部规则文件后的候选。判定偏保守：「拟删」仅用于删掉不影响任何已有行为且无对应产物/测试的条款；其余降级为「拟合并」或「需用户定」。**未经你点头不执行任何删除。**

### 4.1 两个最强单点候选（建议优先处理）

1. **孤儿文件 `playwright/references/case-feedback.md`** — 已核实无任何文件引用它（SKILL.md:44、§5:41 的引用都指向 `phases/§12-case-feedback.md`），且其 schema 与 §12 的 CaseCorrections@1 冲突，疑为旧版残留。**拟删整文件**（或确认后并入 §12）。保守度：建议。需你确认。
2. **跨 8 个 phase 的「禁止」三连块**（用户文字非 UI 事实 / 不弱化断言 / 不改 repos）— §1/§3/§4/§5/§7/§8/§12 文末几乎都重复同一三行，且 SKILL.md 硬规则已含等价条款。**拟合并**：权威表述留 SKILL.md 硬规则，各 phase 改为引用。注意：这可能是「phase 隔离阅读（不预读其他 phase）」的有意冗余——若你认为该设计要保留，则不动。需你定。

### 4.2 case-draft 冗余候选

| 文件:行 | 规则摘要 | 判定 | 拟动作 | 保守度 |
|---|---|---|---|---|
| prompts/agent-worker.md:39 vs :41 | 「确保不泄漏 SourceRef」抽象版 vs「不得写进 archive.md」具体版 | 重复 | 拟合并(留具体版:41) | 建议 |
| SKILL.md:44 vs :27 | featureDir 唯一写入根/禁手拼（硬规则 vs 工作流 step1） | 重复 | 拟合并(措辞去重) | 建议 |
| prompts/agent-worker.md:35 vs SKILL.md:28 | Worker 只返回 JSON 不追加散文 | 重复 | 拟合并(留 worker 模板版) | 吃不准 |
| prompts 三处「硬规则优先/冲突记 out_of_scope」 | spec/quality reviewer 各一份 | 重复 | 拟合并(抽共享片段) | 吃不准 |
| prompts/agent-quality-reviewer.md:46 vs :14-16 | 机械合规问题记 out_of_scope（复述） | 重复 | 拟合并 | 吃不准 |

### 4.3 playwright-automation 冗余候选

| 文件:行 | 规则摘要 | 判定 | 拟动作 | 保守度 |
|---|---|---|---|---|
| SKILL.md:71 vs :72 | 覆盖忠实度拆成「步骤」「预期」两条 | 过度细化 | 拟合并为一条 | 吃不准 |
| SKILL.md:73 / §3:20 / §6:66 / quality-reviewer / §1 P0 行 | 禁 surface 契约测试（多处重复） | 重复 | 拟合并(权威留 §6:60-68) | 建议 |
| §3-ui-plan.md:24-27 | 文末禁止三连（与 bootstrap 段重申） | 重复 | 拟合并(进 SKILL 硬规则) | 建议 |
| §6:140-156 / §9:32 / §7 / §4 / cli-essentials / quality-reviewer | 禁 waitForTimeout/networkidle band-aid（多处） | 过度细化 | 拟合并(等待策略集中一处) | 吃不准 |
| §6:170-184 vs §9:80-86 vs quality-reviewer | 禁 try/catch/test.skip/?.[0] 守卫（三处同义） | 重复 | 拟合并(去重) | 建议 |
| §1:147-153 vs :155-165 | 「只读限制确认」与文末「禁止」同文件重叠 | 重复 | 拟合并 | 建议 |
| §1:60-71 vs :5-20 | bootstrap/blocked 判定写两遍 | 过度细化 | 拟合并 | 吃不准 |
| SKILL.md:13 vs 硬规则:60-61 | 「无证据不出脚本/无 self-run 不下结论」概述 vs 硬规则 | 重复 | 拟合并(留硬规则版) | 吃不准 |
| §7:53-61 / §7 template / §11:11-20 | 「必须打印 headed full 验收命令」三处 | 重复 | 拟合并(权威一处) | 建议 |
| §4:101 / §5:33 / §6:18 | 「3 次预算耗尽后禁进 generate」三处复述 | 重复 | 拟合并 | 建议 |
| references/cli-essentials.md:235 | 「演示视频可选」无触发条件/无门禁 | 自指元规则 | 需用户定 | 吃不准 |

### 4.4 保留区（明确该保留，不动）

均有「明确触发条件 + 明确动作/禁止 + 对应真实产物或测试」：

- playwright 阶段管线门禁、§10 的 15 项质量门（各对应 `.claude/scripts/_shared/lint/*.ts` 真实 lint）、`kata cases lint` 退出码门。
- 可追溯头（§6:22-46，由 `case_traceability_header` lint 强制）、目录/产物布局（对应 `no_feature_local_helpers`/`no_debug_in_cases` lint）。
- env-preflight 哨兵与逐字固定模板（§2 整文件，行为契约）。
- §12 case-feedback 的 8 类 category/3 级 confidence/CaseCorrections@1 schema/去重三元组/50 条阈值。
- case-draft 证据契约（SourceRef 分层 lint、FeatureManifest@2、case_id↔requirement_atom_ids 对账、blocking pending 计数、表单字段基线 lint、Status/BlockedEnvelope 契约）。**注**：case-draft 的 `## 硬规则` **无 SHA/COUNT 基线测试**（该测试不存在），其语义等价靠人工逐条对照 + `check:skills` + `bun run test:e2e:fixture`（case-draft e2e fixture replay）验收。
- naming-convention.md（整文件，对应 `kata features resolve` 引擎）。

---

## 5. ✅ 审查闸门 — 已通过（2026-06-01 用户逐项点头）

用户决策（本节为 Phase 3 执行的权威依据）：

1. **§2 的「忠实度」全局替换词** → **选 A**：名词处用「步骤与断言的真实性」，动词处用「真实实现 / 真实断言」。跨 9 处（playwright SKILL.md:71/72、§6:9/60、prompts/agent-quality-reviewer.md:26、references/cli-essentials.md:181、§1:104、§3:20、§6:34）统一替换；关键禁令补「为什么」一句（surface 测试证明不了业务结果正确）。
2. **§3 两处 description 改动** → **同意「沉淀→记录」**：infra-diagnose SKILL.md:3、knowledge-curate SKILL.md:3 各改一处；触发词 / 路由关键词 / <1536 字符均不破。
3. **§4 冗余规则范围** → **强候选 + 「建议」级合并**：
   - approve §4.1 两强候选：删孤儿文件 `playwright/references/case-feedback.md`；跨 8 phase「禁止」三连块合并（权威留 SKILL.md 硬规则，各 phase 改引用）。
   - approve §4.2、§4.3 中标「建议」的合并项；标「吃不准」「需用户定」的全部**保留不动**。
   - §4.4 保留区不动。
   - 具体「建议」级清单（执行白名单）：
     - §4.2：`agent-worker.md:39 vs :41`（留具体版 :41）、`SKILL.md:44 vs :27`（措辞去重）。
     - §4.3：`SKILL.md:73 / §3:20 / §6:66 / quality-reviewer / §1 P0`（权威留 §6:60-68）、`§3:24-27` 禁止三连（进 SKILL 硬规则）、`§6:170-184 vs §9:80-86 vs quality-reviewer`（去重守卫禁令）、`§1:147-153 vs :155-165`（只读限制合并）、`§7:53-61 / template / §11:11-20`（headed 验收命令权威一处）、`§4:101 / §5:33 / §6:18`（预算耗尽三处复述合并）。

A 类（§1）无需逐条审，随各技能 task 直接替换、grep 清零验收。**闸门已通过，Task 5（case-draft）起的逐技能改写可启动。**
