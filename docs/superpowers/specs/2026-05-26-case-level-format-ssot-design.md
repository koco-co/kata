# 用例级节点格式 SSOT 与 fewshot 落地设计

- 日期：2026-05-26
- 状态：草稿（待用户复核）
- 范围：case-draft + case-edit 双 skill 与 core/rules 的用例级节点格式条款合并去重；新增 fewshot 样例。
- 取材：`workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-main-flow-sample.{md,xmind}`（用户长期沉淀的「最佳实践与规范」样例，仅作为格式参照，不含需求事实）。

## 1. 目标

把用户在 `tmp/` 下沉淀的 md + xmind 用例规范，提炼成本仓库的**用例级节点格式 SSOT**，与现有规则做增/删/改/合，并作为 fewshot 注入 case-draft 与 case-edit 两个 skill，让模型在新建/编辑用例时自动对齐这套规范。

非目标：

- 不涉及非用例级（章节、frontmatter、manifest、coverage-matrix）字段约束。
- 不涉及 PRD → 用例的发现流程改造。
- 不修改 xmind-gen 引擎；fewshot 是给模型看的格式参照，不替代渲染管线。

## 2. 现状与差距

现有规则分散在四个文件：

| 文件 | 类型 | 含用例级条款 |
| --- | --- | --- |
| `.ai/core/skills/case-draft/references/output-standard.md` | normative | 用例标题、括号语义、用例内容质量、xmind 节点可读性 |
| `.ai/core/skills/case-draft/skill.yaml#body.always_load.hard_rules` | hard_rule | 标题禁机器标识、括号语义、预期具体可验、证据底线 |
| `.ai/core/skills/case-edit/skill.yaml#body.always_load.hard_rules` + `codex_override.hard_rules` | hard_rule | 9 条格式细节（动作冒号写法、规则描述、占位符 SQL 等） |
| `.ai/core/skills/case-edit/references/archive-xmind-sync.md` | normative | 跨格式一致性、xmind 可读性、DQ 规则任务管理前置链 |
| `.ai/core/rules/case-qa.md` | rule | Markdown/XMind 一致性维度、xmind 节点可读性、DQ 前置 |

差距：

1. 同义条款在 4 个文件重复（动作冒号写法、规则描述必填、占位符 + SQL 注释块、分区切换正负样本、xmind `<br>` 拆行、单节点引号项 < 3）。
2. 样例中已经形成的若干硬约束没有显式编码：标题三段式（`【Pn】+ 验证动词 + 验证对象 + 验证场景`）、前置条件代码块结构（`/* */` 注释块 + 可执行 SQL + `-- 预期结果`）、XMind 用例 topic 镜像（步骤 = child、预期 = grandchild、notes 存前置条件、priority marker 对照表）、步骤 = 单页面。
3. 没有 fewshot 样例。case-draft 的 `few_shots:` 只挂了 confirmation-package-template，case-edit 完全没有 `few_shots:` 块。

## 3. 设计

### 3.1 SSOT 选址

唯一权威源 = `case-draft/references/output-standard.md`。在其下扩写一个新节「## 用例级节点格式（Case-Level Normative）」承载全部 16 条用例级条款；其他文件（case-qa.md、archive-xmind-sync.md、两个 skill.yaml 的 hard_rules）只保留「收发性」条款（自审清单、语义不变底线、corrections 同步底线、引用 SSOT 的指针）。

### 3.2 用例级节点格式条款（16 条，SSOT 内容大纲）

#### 通用 — Markdown 用例节点

1. 层级：`## 一级模块` → `### 二级模块` → `#### 子分组(可选)` → `##### 【Pn】用例标题`。
2. 标题：`【Pn】+ 验证动词 + 验证对象 + 验证场景/结果`；验证对象内可嵌套业务括号 `【...】`（如规则名）。禁机器标识（TC-/SR-/RA-）。优先级括号专用 `【】`，UI/字段名专用 `「」`。
3. 用例正文按顺序包含两个 blockquote 段落且只能出现一次：
   - `> 前置条件` → 紧跟 ` ```sql ` 代码块。
   - `> 用例步骤` → 紧跟三列表格 `| 编号 | 步骤 | 预期 |`。
4. 前置条件代码块内部结构：
   - 顶部 `/* ... */` 多行 SQL 注释，逐条编号描述「依赖的环境/数据源/通用配置/SQL 准备目的」。
   - 紧随可执行 SQL（USE / DROP / CREATE / INSERT / SELECT）。每条 SELECT 用 `-- 预期结果：N` 行内注释标注期望返回。
   - 环境差异项（数据库/Schema）一律用 `${SchemaA}` 等占位符；不得硬编码租户库名。
5. 步骤表格规则：
   - 「步骤」单元格写「动作 + 冒号 + 配置项列表」，配置项以 `<br>- ` 拆行。进入路径 `进入【模块 → 页面】`，按钮/字段 `「」`。
   - 「预期」单元格用 `1)` `2)` … 编号断言，多条预期用 `<br>` 拆行。禁用空泛断言（如「页面正常打开」）作为唯一预期。
   - 一行表格 = 一个交互页面/阶段的操作，不得跨页面合并（监控规则 / 调度属性应拆两行）。
   - 编号必须与操作发生顺序一致。

#### 通用 — XMind 用例节点（镜像 Markdown）

6. 用例 topic title = Markdown H5 标题原文（含 `【Pn】` 前缀，含业务括号）。
7. 用例 topic 必须挂 priority marker：

   | Markdown 标题前缀 | XMind markerId |
   | --- | --- |
   | `【P0】` | `priority-1` |
   | `【P1】` | `priority-2` |
   | `【P2】` | `priority-3` |
   | `【P3】` | `priority-4` |

8. 用例 topic 的 `notes.plain.content` = Markdown 前置条件代码块**裸内容**（含 `/* */` 注释 + SQL，不带 ```sql 围栏）。
9. 用例 topic 的 attached children = 步骤列表，每个步骤是一个 child topic，title = markdown 表「步骤」单元格的真实换行版本（把 `<br>` 还原为 `\n`）。
10. 每个步骤 topic 下挂**一个**预期 grandchild topic，title = markdown 表「预期」单元格的真实换行版本。
11. XMind 节点 title 与 notes 内一律禁出现 `<br>`。超长 SQL/前置/步骤/预期需要拆成 children 或 notes，不得堆进单 title。

#### 数据质量子集 — DQ 规则任务管理类用例

12. 标题对象部分用三段式 `【校验类型-生效范围-统计函数】`（如 `【完整性校验-字段级-空值数】`），保留业务括号。
13. 前置条件必须包含：`USE ${SchemaA}` → DROP/CREATE 分区表（带 `PARTITIONED BY`、`STORED AS ORC`）→ 多分区 INSERT 制造正/异常数据 → SELECT 校验空值数/期望值。
14. 步骤必须按业务前置链顺序：
    1. 规则集管理新建规则集与规则包；
    2. 在规则包中新增校验规则（含「规则描述」必填业务句）；
    3. 规则任务管理新建监控规则；
    4. 引用规则包；
    5. 配置调度属性并执行；
    6. 查询校验结果。
15. 正/异常对照不得通过改规则集期望值制造失败。保持规则集/规则包不变，只在「规则任务管理」编辑分区后再执行。
16. 「规则描述」字段必填业务含义句，预期必须验证「保存 + 详情回显」。

### 3.3 现有规则文件的 diff

#### A. `case-draft/references/output-standard.md`（SSOT，扩写）

- 新增「## 用例级节点格式（Case-Level Normative）」承载 §3.2 全部 16 条。
- 原「用例标题（硬）」「括号语义（硬）」「用例内容质量（硬）」「cases.xmind」段落保留但收敛：去除与新节重复的句子，改为引用「详见上节」。
- 文件顶部增加：「本文件中带 `(硬)` 的条款均为 hard_rules；新节『用例级节点格式（Case-Level Normative）』是用例级格式 SSOT，case-qa.md / archive-xmind-sync.md / case-draft skill.yaml / case-edit skill.yaml 均反向引用本节。」

#### B. `core/rules/case-qa.md`（瘦身 + 反向引用）

- 保留：首段自检要求、文末「产物变更后检查」清单。
- 改写：「Markdown/XMind 一致性」「XMind 可读性」「数据质量用例前置条件」三节合并为一节「## 一致性自检维度」，仅列「版本/模块、需求、标题、优先级/marker、前置条件、步骤、预期」六维清单 + 业务括号保留例外，其余指向 SSOT。
- 删除：`<br>` 写法、动作冒号写法、`${SchemaA}` 占位符、SQL 注释块、规则描述、拆步骤、规则集前置链等细节。

#### C. `case-edit/references/archive-xmind-sync.md`（瘦身 + 反向引用）

- 保留：首段「语义不变」、第 21 段「编辑诉求模糊一次澄清」、第 23 段「不得越界生成新需求」、整个「## corrections 触发的同步」节。
- 改写：第 9/15/17/19 段（xmind 可读性、占位符与 SQL 注释、动作冒号写法、规则描述必填等）改为一句指针：「用例级节点格式细节以 `case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准。」
- 删除：与 SSOT 重复的所有细节句。

#### D. `case-draft/skill.yaml#body.always_load.hard_rules`

- 保留 14 条中除「用例标题禁机器标识」「括号语义」「每步预期具体可验」「证据底线（最后一条）」之外的全部条款（结构性规则不动）。
- 改写：上述四条收敛为单条：「用例级节点格式与内容质量条款以 `references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准；output-standard.md 中标 `(硬)` 的条款均视为 hard_rule。」
- 不动：few-shot 格式参照行为说明、Lanhu/Axure 静默执行等。

#### E. `case-edit/skill.yaml#body.always_load.hard_rules` 与 `codex_override.hard_rules`

- 保留：「编辑或同步时语义须完整保留」「缺失的前置/步骤/预期不得凭空补造」「自审 Archive↔XMind 一致性」「业务括号保留」「corrections 同步底线」五条。
- 改写：余下 9 条格式细节收敛为单条：「用例级节点格式与可读性以 `case-draft/references/output-standard.md#用例级节点格式（Case-Level Normative）` 为准；DQ 规则任务管理类用例额外遵循该节『数据质量子集』段。」
- `codex_override.hard_rules` 与 `always_load.hard_rules` 镜像同样替换。

### 3.4 Fewshot 落地

新增目录与文件：

```
.ai/core/skills/case-draft/references/fewshots/
├── case-format-sample.md          # 精简 md 样例（保留 1 条 P0 完整用例）
└── case-format-sample.xmind.md    # XMind 镜像示意（ASCII 树状 + 标注）
```

**case-format-sample.md 取材**：直接采用 `tmp/lt-dq-main-flow-sample.md` 的 P0 用例（全部 8 步骤、完整 SQL 注释块、`${SchemaA}` 占位符、`1)/2)` 预期编号、`<br>- ` 配置列表、规则描述必填等所有格式特征）。顶部加 5-10 行 HTML 注释「格式速查」，列「标题三段式 / 前置条件必带 SQL 注释块 / 步骤=单页面 / 预期=编号断言 / 占位符 / 业务括号」。frontmatter 中 `create_at / status / case_count` 改为占位 `<replace-when-rendering>`，避免被当成业务事实。

**case-format-sample.xmind.md 取材**：用 ASCII 树状展示样例完整层级（画布 → 根 → 模块 → 子模块 → 用例 → 步骤 → 预期）；每个用例 topic 旁标注 `[marker: priority-1] [notes: 前置条件代码块裸内容片段]`；每个步骤 topic 旁标注 `[title: 真实换行版本]`，对照同份 markdown 表格的 `<br>` 写法。顶部加「映射对照表」段：md `##### 标题` ↔ xmind topic title、md `> 前置条件` ↔ topic notes、md 表格步骤 ↔ step child topic、md 表格预期 ↔ expected grandchild topic。

为什么 xmind 用「.md 描述」而非真 .xmind：fewshot 给模型看的是**结构与映射**；真 .xmind 是 zip + JSON，模型只能看见 JSON 文本，结构反而被掩盖。ASCII 树状能把镜像规则展示得最清楚。

**双 skill 挂载**：

- `case-draft/skill.yaml#few_shots`：追加两条
  ```yaml
  - path: references/fewshots/case-format-sample.md
    load_phases: [case-draft, output]
    purpose: 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。
    load_when: step.id in [case-draft, output]
    max_tokens: 3000
  - path: references/fewshots/case-format-sample.xmind.md
    load_phases: [case-draft, output]
    purpose: XMind 用例 topic 与 md 用例的映射对照。
    load_when: step.id in [case-draft, output]
    max_tokens: 1500
  ```
- `case-edit/skill.yaml`：现状没有 `few_shots:` 块 → 新增同结构的 `few_shots:` 段，挂同两个文件，`load_phases: [plan_edit, output]`。

**workspace tmp 源文件**：原 `tmp/lt-dq-main-flow-sample.md` 和 `lt-dq-main-flow-sample.xmind` 保留为 workspace 历史源，不动。本设计文档顶部已记录取材路径，未来若样例升级，按取材路径同步 fewshot。

## 4. 文件清单

| 操作 | 路径 |
| --- | --- |
| 新增 | `.ai/core/skills/case-draft/references/fewshots/case-format-sample.md` |
| 新增 | `.ai/core/skills/case-draft/references/fewshots/case-format-sample.xmind.md` |
| 改写 | `.ai/core/skills/case-draft/references/output-standard.md` |
| 改写 | `.ai/core/skills/case-draft/skill.yaml` |
| 改写 | `.ai/core/skills/case-edit/skill.yaml` |
| 改写 | `.ai/core/rules/case-qa.md` |
| 改写 | `.ai/core/skills/case-edit/references/archive-xmind-sync.md` |

## 5. 验收

1. `bun engine/bin/kata ai-core projection render` 通过，且 `.claude/skills/{case-draft,case-edit}/SKILL.md`、`.agents/skills/{case-draft,case-edit}/SKILL.md` 与 source 一致。
2. `bun engine/bin/kata ai-core projection lock render` 通过（避免 preflight / GA gate 因 lock hash mismatch 失败）。
3. `bun run test:ai-core` 全绿；若 `case-draft-hardrules-regression.test.ts` 的 COUNT/SHA 基线打架，按既定流程同步基线后再跑。
4. `bun run check` 全绿。
5. 手工验收：渲染后的 `.claude/skills/case-draft/SKILL.md` 中 hard_rules 没有掉「不能为机器标识」「业务括号保留」「证据底线」等关键语义；新增的 `用例级节点格式（Case-Level Normative）` 节出现在 output-standard.md 的渲染产物中。

## 6. 风险与回滚

- 风险 1：hard_rules 从十几条压成「指针 + 一句」后，未来 prompt 渲染 / hard_rules 计数测试可能基线漂移 → 同步基线即可。
- 风险 2：fewshot 引入后 case-draft 在 case-draft / output 阶段 token 增加约 4500 → 在 `context_budget` 的 `few_shots: 5000` 内（具体见 skill.yaml），可控。
- 风险 3：xmind fewshot 用 ASCII 描述而非真 xmind，若模型仍误生成 `<br>` 节点 → 由 `case-qa.md` 自审 + `bun engine/bin/kata` 一致性检查兜底。
- 回滚：单 commit revert 即可还原四个文件的瘦身与 fewshot 引入。
