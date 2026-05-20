# Case Feedback Loop — Design Spec

- 日期: 2026-05-20
- 作者: kata (brainstorming session)
- 状态: approved
- 涉及 skills: `playwright-automation`, `case-edit`

## 1. 背景与问题

`/playwright-automation` 在编写 UI 自动化时，反复发现 `archive.md` / `cases.xmind` 中的用例描述存在质量问题（业务规则错误、UI 文案漂移、不可执行的模糊表达、依赖缺失、断言不可验证、优先级标错、冗余/重复、遗漏覆盖点）。当前 `plan-reconcile` reference 明确禁止修改 `archive.md` 与 `test-point-checklist.md`，将其视为历史记录；脚本只对齐 live UI，但用例文档不会被反哺，质量问题持续累积。

诉求：让 agent 在 UI 自动化编写过程中按需反哺 xmind / md 用例，持续优化用例质量；同时保留人工审批关，防止 agent 误判污染用例资产。

## 2. 目标与非目标

### 目标
- 在 `/playwright-automation` 工作流中识别上述 8 类用例描述问题，产出结构化 corrections 工件。
- 通过 `/case-edit apply-corrections` 子命令完成审批与回写，保持 archive↔xmind 一致。
- 每条 correction 携带可追溯证据；apply 过程产生独立 apply-log。
- 多次反哺不会滚雪球（同三元组去重）；并发改动不会被静默覆盖（找不到原文跳过并记日志）。

### 非目标 (YAGNI)
- 不反哺 `test-point-checklist.md`（避免与 case-draft 契约打架）。
- 不自动追加 `manifest.json#automation.intents`（遗漏覆盖点先以新 archive case 形式出现）。
- 不反哺 `metadata.yaml` 的 priority 分布。
- 不做跨 feature 的风格统一性反哺。
- 不实现"agent 直改用例"的自治模式；不实现按类别分级的混合自治。

## 3. 整体架构

```
playwright-automation               case-edit
─────────────────────               ─────────
ui-probe → plan-reconcile           (新) apply-corrections
   │                                   │
   ├─ (新) emit case-corrections.md    ├─ dry-run summary
   │                                   ├─ 读 corrections.md
self-run → run-triage                  ├─ 按 status=approved 回写 archive.md
   │                                   ├─ 触发 archive-xmind-sync
   └→ handoff (含 corrections 路径)    └─ 写 apply-log
```

**核心原则**：`playwright-automation` 只**发现并产出** corrections，绝不直接动 archive/xmind；`/case-edit` 是 archive/xmind 的**唯一编辑入口**。两边通过工件 `results/<run-id>/case-corrections.md` 解耦。

## 4. corrections 生成（playwright-automation 侧）

### 4.1 新增 step `case-feedback`

位置：`run-triage` 之后、`handoff` 之前。新增 reference `references/case-feedback.md`，定义生成协议、schema、confidence 判定。

### 4.2 问题来源映射

| 触发阶段 | 数据来源 | 覆盖的问题类型 |
|---|---|---|
| `plan-reconcile` | `discrepancies[]` | UI 文案漂移、依赖/前置缺失、断言不可验证 |
| `ui-probe` | `observed_facts` 与 archive 偏差 | 业务规则错误、模糊表达 |
| `run-triage` | 归类为「脚本/数据无误但 archive 描述本身错」 | 业务规则错误、断言不可验证 |
| `ui-probe` | 真实 UI 出现 archive 未覆盖的关键场景 | 遗漏覆盖点 |
| `case-feedback` 整理阶段 | archive 同点位多次出现 | 冗余/重复 |
| `run-triage` | archive 标记 P0 但实际不可自动化且无 E2E 价值 | 优先级标错 |

### 4.3 plan-reconcile 规则调整

`references/plan-reconcile.md` 第三步「冲突裁决原则」修改：
- 旧规则："不修改 archive.md 或 test-point-checklist.md"
- 新规则："plan-reconcile 不直接修改 archive.md，发现的差异写入 `case-corrections.md` 由 `/case-edit apply-corrections` 处理。test-point-checklist.md 仍不修改。"

### 4.4 corrections.md schema

存放路径：`workspace/<project>/features/<featureId>/results/<run-id>/case-corrections.md`

```markdown
---
feature: <featureId>
run_id: <run-id>
generated_at: <ISO 8601>
generator: playwright-automation@1
status: pending  # pending | applying | applied | aborted
total: N
by_category:
  ui_text_drift: 4
  business_rule: 2
  ambiguous_step: 1
  dependency_missing: 1
  unverifiable_assertion: 0
  wrong_priority: 1
  duplicate: 0
  missing_coverage: 2
---

# Case Corrections — <featureId> / <run-id>

## C-001  ui_text_drift  ★★★ (confidence: high)

- **case_ref**: archive.md#L120 / cases.xmind 节点 `数据质量 > 概览 > P0-1`
- **category**: ui_text_drift
- **doc_claim**: "进入【概览】页面"
- **observed_ui**: 实际菜单文本为 "数据质量概览"
- **evidence**: SR-UI-PROBE-001 (screenshots/ui-probe-overview.png 第 14 行)
- **proposed_change**:
  ```diff
  - 进入【概览】页面
  + 进入【数据质量概览】页面
  ```
- **rationale**: live UI 与 archive 文案不一致；脚本已按 live UI 调整。
- **status**: pending           # 用户改为 approved / rejected / edited
- **user_note**:                # 用户可选填
- **previously_rejected**:      # 自动填充，若曾被 reject

## C-002  business_rule  ★★ (confidence: medium)
...
```

### 4.5 字段约束

- `confidence`:
  - `high` — 有 probe 截图 + locator 命中 + 文本完全匹配
  - `medium` — 有 probe 证据但需主观判断（如"模糊步骤"是否应该改）
  - `low` — 仅基于失败归因推断，无直接 UI 证据
- `status` 默认 `pending`；`/case-edit apply-corrections` 只处理 `approved`。
- `evidence` 必须引用 ui-probe 截图、locator 路径或 run-triage 报告的 source_ref；不得为空。
- `case_ref` 必须同时给 archive.md 行号 + cases.xmind 节点路径（archive-xmind-sync 已建立该映射）。
- `category` 取值受限于上述 8 类。

### 4.6 confidence 判定准则

| 问题类型 | high 条件 | medium 条件 | low 条件 |
|---|---|---|---|
| ui_text_drift | locator 命中 + 截图 OCR 比对 | locator 命中但无 OCR 比对 | 仅基于脚本调整推断 |
| business_rule | run-triage 明确归类为 archive 描述错 | probe 显示行为差异 | 推断 |
| ambiguous_step | ui-probe 反复无法定位 | 单次定位失败 | 仅主观判断 |
| dependency_missing | probe 显式跳转到前置页 | probe 提示缺资源 | 推断 |
| unverifiable_assertion | DOM 无对应可见元素 | 元素存在但无文本断言依据 | 推断 |
| wrong_priority | run-triage 标记 partial_automation | 推断 | 推断 |
| duplicate | 多 case 同 case_ref | 同语义不同文本 | 推断 |
| missing_coverage | probe 命中明显未覆盖入口 | probe 命中边缘场景 | 推断 |

### 4.7 handoff 报告新增段落

`references/handoff.md` 在末尾追加：

```markdown
## Case Feedback
- corrections: results/<run-id>/case-corrections.md (<total> pending)
- 应用命令：/case-edit apply-corrections <feature_path> <run-id>
- by_category: ui_text_drift=4, business_rule=2, ambiguous_step=1, ...
```

若本轮无 corrections，段落仅写 `corrections: none`。

## 5. 回写（case-edit 侧）

### 5.1 新增子命令 `apply-corrections`

调用方式：
```
/case-edit apply-corrections <feature_path> <run-id>
```

新增 reference `references/apply-corrections.md`，定义协议、dry-run summary 模板、落地协议、apply-log schema、冲突跳过策略。

### 5.2 执行流程

1. **加载** `workspace/<project>/features/<featureId>/results/<run-id>/case-corrections.md`。若 `status != pending`，提示并退出。
2. **dry-run summary**：按 category 分组打印计数 + 每组前 3 条样例（C-id / category / confidence / doc_claim 前 60 字符），提示三选一：
   - `proceed` — 把 status=approved 的全部落地
   - `edit first` — 退出，请用户先编辑文件后重跑
   - `abort` — 不做任何改动，frontmatter status 改为 `aborted`
3. 收到 `proceed` 后，对每条 `status: approved` 的 correction：
   - 按 `case_ref` 的 archive.md 行号 + `doc_claim` 文本定位。
   - 用 Edit 工具应用 `proposed_change` 中的 diff。
   - 若 `doc_claim` 在 archive 中找不到精确匹配 → 跳过，记录 `skipped: source_changed`。
   - 若 `proposed_change` 已被先前 commit 应用过 → 跳过，记录 `skipped: already_applied`。
4. archive.md 全部改完后，调用 `archive-xmind-sync.md` 现有契约同步到 `cases.xmind`。
5. **校验** archive↔xmind 字段一致（这是 case-edit 现有自检的一部分）。
6. **写 apply-log** 到 `results/<run-id>/case-corrections-applied.md`，包含：
   - 每条 correction 的 before/after diff
   - apply 时间戳
   - 跳过原因（如有）
   - xmind 同步结果
7. **更新 frontmatter** `status: applied`，写回原 corrections.md（保留历史可追溯）。

### 5.3 archive-xmind-sync 增补

`references/archive-xmind-sync.md` 增加段落「corrections 触发的同步」：明确 apply-corrections 调用同步时，xmind 节点定位以 corrections.md 中的 `case_ref` xmind 节点路径为准，不再重新解析 archive 全文。

## 6. 冲突 / 并发 / 去重

- **archive 已被人工改过**：apply 时若 `doc_claim` 在 archive 找不到精确匹配 → 跳过该条 + apply-log 记 `skipped: source_changed`，不阻塞其他条目。
- **同一 feature 多次反哺**：每个 run-id 独立一份 corrections.md，互不覆盖。
- **跨轮去重**：playwright-automation 生成新 corrections 时扫描该 feature 下所有历史 `case-corrections-applied.md`，按 `(case_ref, doc_claim, proposed_change)` 三元组去重，避免滚雪球。
- **rejected 反复出现**：若一条 correction 在历史轮被 `rejected`，新一轮再次生成时在 corrections.md 中填充 `previously_rejected: <prev_run_id>`，作为提示但不强制阻断（用户可能改主意）。

## 7. 受影响文件清单

实施时需创建或修改：

| 路径 | 动作 | 说明 |
|---|---|---|
| `.ai/core/skills/playwright-automation/skill.yaml` | 修改 | outputs 增加 `case_corrections`；新增 `case-feedback` step；调整 plan-reconcile 相关 hard_rule |
| `.ai/core/skills/playwright-automation/references/case-feedback.md` | 新建 | 定义生成协议、schema、confidence 判定、去重 |
| `.ai/core/skills/playwright-automation/references/plan-reconcile.md` | 修改 | 把禁止修改 archive 改为写入 corrections.md |
| `.ai/core/skills/playwright-automation/references/handoff.md` | 修改 | 新增 Case Feedback 段落模板 |
| `.ai/core/skills/case-edit/skill.yaml` | 修改 | 声明 `apply-corrections` 子命令与允许的写入路径 |
| `.ai/core/skills/case-edit/references/apply-corrections.md` | 新建 | 定义 dry-run summary、落地协议、apply-log schema、冲突跳过策略 |
| `.ai/core/skills/case-edit/references/archive-xmind-sync.md` | 修改 | 增补 corrections 触发的同步段落 |
| `engine/tests/ai-core/case-feedback.test.ts` | 新建 | 覆盖 corrections 生成 schema、去重、confidence 取值 |
| `engine/tests/ai-core/apply-corrections.test.ts` | 新建 | 覆盖 dry-run summary、落地、跳过、xmind 同步、apply-log |
| projection 渲染 | 命令 | `bun engine/bin/kata ai-core projection render` 后 lock |

## 8. 验收标准

- `/playwright-automation` 跑完一个 feature 后，若存在差异，`results/<run-id>/case-corrections.md` 自动生成且 schema 合规。
- handoff 报告末尾出现 Case Feedback 段落，命令可直接复制。
- 在 corrections.md 把若干条改为 `approved` 后跑 `/case-edit apply-corrections`，archive.md 与 cases.xmind 同步更新，apply-log 完整。
- 人为破坏 archive（修改 doc_claim 文本）后再 apply，被跳过的条目记录原因。
- 同一 feature 跑第二轮，已经 applied 的 correction 不会再被生成；rejected 的会带 `previously_rejected` 标记。
- 所有新增/修改的 reference 通过 `bun run lint:ai-core` 与 `bun test`。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| corrections 数量爆炸 (>50)，用户审批疲劳 | dry-run summary 按 category 分组，并提供 `edit first` 选项让用户先批量删减 |
| 跨轮去重失误，相同问题反复弹出 | 三元组键 `(case_ref, doc_claim, proposed_change)` + previously_rejected 标记 |
| archive 同时被人工 / agent 修改导致竞态 | `doc_claim` 匹配失败即跳过；apply-log 显式记录 source_changed |
| xmind 同步失败 | 复用 case-edit 现有 archive-xmind-sync 自检；失败时回滚 archive 改动并报错 |
| playwright-automation hard_rules 进一步臃肿 | 反哺逻辑全部下沉到独立 reference `case-feedback.md`，skill.yaml 只列 step 与输出 |
