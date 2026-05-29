# 新窗口接续提示词（P3-P6 plan 写作 + 总审）

## 任务总览

基于 design spec `/Users/poco/Projects/kata/docs/superpowers/specs/2026-05-28-kata-arch-overhaul-design.md`（kata e-backbone 架构大重构）的 §11 P1-P6 Roadmap，用 `superpowers:writing-plans` skill 拆 6 个 implementation plan。每写一份 plan 文件，**指派 codex-rescue subagent**（gpt-5.x@xhigh, effort=high）审查；审查不通过自己修，修完后再请 codex 复审；不限轮数，直到 codex 明确 "READY TO EXECUTE"。全部 6 份 plan + 总审通过后**一次性**交给用户审查，中间不要停（auto mode）。

## 关键协议（不可违反）

1. **长文档分批落盘**：plan/spec/design >500 行时**禁止**用一次 Write 整篇写完。先 Write 落 header + 前 1-2 章节，后续用 `cat >> ... << 'EOF'` 或 Edit 追加。详见 `~/.claude/projects/-Users-poco-Projects-kata/memory/feedback-long-doc-batching.md`。
2. **Worktree-first**：本次工作只写 plan / review log，不写实际代码；不需要创建 worktree。但 plan 内容里仍要按 `.claude/rules/project-workflow-rules.md` 描述 worktree 步骤（pre-flight commit → `git worktree add --detach .worktrees/<slug> main` → symlink `.kata` → 完成验证后 `git merge --no-ff <sha>` → `git push` → `git worktree remove`）。
3. **Conventional commits**：plan 中的所有 commit message 严格用 `.claude/rules/project-workflow-rules.md` 表（`refactor: ✨ ...` / `feat: 🧩 ...` / `merge: 🔀 ...` / 等）。
4. **Codex review 多轮迭代**：每轮 review 收到 finding 后，逐条判定 valid/invalid（不盲信），valid 项写到 review log（`docs/superpowers/reviews/2026-05-29-p{N}-{slug}-codex-review.md`），应用修复，再派 codex 复审。直到 codex 写 "READY TO EXECUTE"。
5. **TaskCreate/TaskUpdate 跟进**：维护可视化任务列表。
6. **唯一 reviewer model 约束**：spec §6.9 + P2 `decidePhase` 单 step 单 envelope。worker step 与 reviewer step 必须**分开**，不能在同一 subagent step 既配 `workers: [X]` 又配 `reviewers: [Y]`。每个 review step `reviewers: [name]` 单数；每个 worker step `workers: [name]` 单数；model/effort 直接写在 workflow.yaml step 上。reviewer/worker 文件 frontmatter **只允许 `name` 单字段**。
7. **artifact_kinds_produced 守门**：只有真实落 final 文件（schema 已建）才能 emit `artifact_written`。中间证据（source-snapshot / playwright trace 等）改用 `decision_made { topic: 'source_snapshot' | 'trace_collected', payload }`。
8. **事件路径约定**：P2 真实路径 `<workspaceRoot>/workspace/<project>/features/<featureId>/events/<runId>.jsonl`（P2 plan line 422/441/465）。
9. **事件字段**：`event_kind`（不是 `kind`）；validator_failed / blocked emit 必须 `status: 'failed'`。
10. **fake-orchestrator smoke**：复用 P2 `openSession` / `decidePhase` / `buildDispatchEnvelope`；不调用 `emitArtifactWritten`、不引入 spawn hook、不实跑 LLM；`hashed_artifact_ref: 'sha256:' + '0'.repeat(64)`（满足 P2 pattern）。

## 当前状态（截至本提示词生成时）

| Task | 状态 | 产物 |
|---|---|---|
| #1 P1 Cleanup plan（7 commits） | ✅ Completed | `docs/superpowers/plans/2026-05-29-p1-cleanup.md`（2156 行）+ review log |
| #2 P1 codex review + 修复 | ✅ Completed | 5 blocker 全是幻觉 / 2 项真实小修已应用 |
| #3 P2 Event journal core plan | ✅ Completed | `docs/superpowers/plans/2026-05-29-p2-event-journal-core.md`（~2150 行）+ review log |
| #4 P2 codex review + 修复 | ✅ Completed | 5 blocker + 7 major + 1 minor 全修；M1 spec 措辞歧义已澄清 |
| #5 P3 Skill migration plan | ✅ Completed | `docs/superpowers/plans/2026-05-29-p3-skill-migration.md`（~4170 行） |
| #6 P3 codex review + 修复 | ⚠️ In Progress（round-5 待修） | review log: `docs/superpowers/reviews/2026-05-29-p3-skill-migration-codex-review.md`（310 行） |
| #7 P4 Plugin/Hook/MCP plan | ⏳ Pending | — |
| #8 P4 codex review + 修复 | ⏳ Pending | — |
| #9 P5 Codex runtime adapt plan | ⏳ Pending | — |
| #10 P5 codex review + 修复 | ⏳ Pending | — |
| #11 P6 Polish plan | ⏳ Pending | — |
| #12 P6 codex review + 修复 | ⏳ Pending | — |
| #13 总审：自审 + codex 全量审查所有 plan | ⏳ Pending | — |

## P3 round-5 待修清单（接续后第一件事）

Codex round-5 报了 3 项（2 Major + 1 Minor），全 valid。详细见 `docs/superpowers/reviews/2026-05-29-p3-skill-migration-codex-review.md` 末尾 "Round 5" 章节。核心修复：

### 修复 1：拆 reviewer 独立 step（普适应用 spec §6.9 + §6.11）

每个 skill 的 workflow.yaml 中所有 `workers: [X]` + `reviewers: [Y]` 同 step 都要拆。新 phase 数：

| Skill | 原 phase 数 | 新 phase 数 | 新增 phase |
|---|---|---|---|
| case-draft | 6 | 6 | ✅ 已在 round-2 拆完（spec-review + quality-review）|
| case-edit | 3 | **4** | + §4-spec-review（reviewer only, haiku/low）|
| case-hotfix | 4 | **5** | §3-draft 拆为 §3-draft (worker only) + §4-spec-review (reviewer only, haiku/low)；§4-output → §5-output |
| defect-analyze | 4 | **6** | §3-analyze 拆为 §3-analyze (worker only) + §4-spec-review (reviewer only, haiku/low)；§4-emit 拆为 §5-quality-review (reviewer only, sonnet/medium) + §6-emit (inline 只落 final) |
| infra-diagnose | 4 | 4 | 不变，但按 spec §6.11 "单流程无 review" **删 reviewers/spec-reviewer.md** 文件 + workflow.yaml + manifest 中所有 reviewer 引用 |
| knowledge-curate | 3 | **4** | + §4-spec-review（reviewer only, haiku/low）|
| workspace-manage | 2 | 2 | 不变（spec 无 reviewer）|
| playwright-automation | 7 | **8** | §3-generate 拆为 §3-generate (worker only) + §4-spec-review (reviewer only, haiku/low)；§4-run → §5；§5-repair → §6；§6-quality → §7；§7-handoff → §8 |

每个 skill 的修复需联动改：(a) Files 段 phase 文件列表 (b) SKILL.md "Phase index" + "Loaded by phase" 表 (c) workflow.yaml steps（worker step / reviewer step 分开）(d) `.claude/contracts/skill-manifest.yaml` 该 skill 的 phases 索引 (e) shape test（多列出新 phase 文件断言 ≤150）(f) phases test（断言新 step id 顺序、model、effort）(g) smoke test（断言 phase 顺序、subagent_dispatched 计数与 model/effort）。

case-draft 已是 6 phase（source-intake / atomize / draft / spec-review / quality-review / output），可作为模板。

### 修复 2：rules 文件示例移到 fewshots

- `defect-analyze/rules/mode-dispatch.md` 含 "Ambiguous 例" 表 → 移到 `fewshots/{bug,conflict,diff}-mode.md`
- `defect-analyze/rules/defect-format.md` 含 markdown 输出示例段 → 移到 `fewshots/conflict-mode.md`

rules 文件只保留可校验项（spec §6.4）。

### 修复 3：blackboard slot registry 同步

defect-analyze 拆 review 后新增 slot：`spec_review_artifact_path`、`quality_review_artifact_path`。同步加到自审 §5 slot 列表 + `.claude/contracts/schemas/blackboard-slots.json`（commit 8.1 内）。

### 修复完成后

1. 重派 codex-rescue 做 round-6 复审，重点核查 7 skill 拆分一致性、rules/fewshots 分层、slot 注册
2. 如 round-6 仍有 finding，逐项修，再做 round-7，直到 "READY TO EXECUTE"
3. round 通过后：TaskUpdate #6 → completed；进入 #7 P4 plan 写作

## P4 写作要点（spec §11 + §7-8 + §6.5）

2 个 commit：
- Commit 9 `feat: 🧩 plugin sdk and hook installer`：扩 `plugin-manifest.ts` v2 schema + v1 兼容 adapter（兼容现有 `url_patterns + commands.fetch`）；`capability_required` 缺字段从 warning 改 hard error；新 `engine/src/plugins/event-subscriber.ts`；hooks 5 个迁入 `engine/src/hooks/`；新 `installer.ts` + `cli/hooks.ts`；3 个现有 plugin manifest 升 v2
- Commit 10 `refactor: ✨ upgrade mcp catalog scanning`：新 `apps/mcp/registry.ts`（built-in TOOLS + 从 plugin `mcp_exports` 动态注册 + 新 `kata_query_events` MCP tool，spec §13 I5）；所有 export 必须 read-only（运行时 capability 检查）

## P5 写作要点（spec §11）

2 个 commit：
- Commit 11.spike `chore: 🧹 codex symlink spike (single skill)`：用最简 skill（如 workspace-manage）实测 Codex CLI 对 `.agents/skills/<id>/{phases,reviewers,...}` symlink 解引用、context 限制、prompt 渲染；spike 记录写 `docs/superpowers/specs/codex-symlink-spike-result.md`；不合入主分支
- Commit 11 `feat: 🧩 codex runtime via symlink (if spike pass)`：spike **通过**则按零拷贝策略落地；**不通过**改脚本同步策略，工期重估

## P6 写作要点（spec §11）

1-3 commit：
- Commit 12+ `docs: 📝 e backbone readme + metrics`：README / CHANGELOG / 简历 doc / metric snapshot 截图

## 总审（task #13）

全部 6 份 plan 落地后：
1. 自审：对照 spec 每节扫描，确认 6 份 plan 串起来无遗漏、无重复、commit 顺序合理、依赖链清晰
2. 派 codex-rescue 做全量 plan + spec 交叉审查，重点：phase 间数据流（blackboard slot 传递）、event_kind 一致性、artifact 链路完整性、Migration table（spec §12.1）full coverage
3. round 通过后 TaskUpdate #13 → completed，**一次性**呈给用户审查（用户审完 6 份 plan 才能进入实现阶段）

## 调用 codex-rescue 的提示词模板

```
你是 codex (gpt-5.x@xhigh, effort=high)，对 kata 项目 P{N} {phase-name} plan 做 deep review / round-{K} 复审。

## 上下文（如复审则包含前几轮 finding 与修复策略摘要）

## 复审目标
1. ...
2. ...

## 输出格式
```
### {Blocker|Major|Minor}-N: <标题>
- 位置: 行号
- 问题: <一句话>
- 引用: spec § / P1 / P2
- 修复: <最小修复>
```

最后明确判定：READY TO EXECUTE / NEEDS FURTHER FIX

参考：
- spec: `/Users/poco/Projects/kata/docs/superpowers/specs/2026-05-28-kata-arch-overhaul-design.md`
- P1: `/Users/poco/Projects/kata/docs/superpowers/plans/2026-05-29-p1-cleanup.md`
- P2: `/Users/poco/Projects/kata/docs/superpowers/plans/2026-05-29-p2-event-journal-core.md`
- ...
```

## 立即接续动作

新窗口启动后：
1. Read 本提示词 `docs/superpowers/plans/CONTINUE-PROMPT.md`
2. Read review log `docs/superpowers/reviews/2026-05-29-p3-skill-migration-codex-review.md` 完整内容（理解 round-1 ~ round-5 的全部判定）
3. 按"P3 round-5 待修清单"修 P3 plan 文件（编辑 7 skill 的 workflow / SKILL / shape / phases / manifest / smoke）
4. 派 codex round-6 复审
5. round-6 通过后 TaskUpdate #6 → completed，进入 #7 P4 plan 写作
6. 严格按本提示词"关键协议"和长文档分批落盘原则推进

## 重要 memory 引用

- `~/.claude/projects/-Users-poco-Projects-kata/memory/feedback-long-doc-batching.md` 长文档分批
- `~/.claude/projects/-Users-poco-Projects-kata/memory/feedback-degrade-when-blocked.md` 受阻时降级
- `~/.claude/projects/-Users-poco-Projects-kata/memory/feedback-recommend-with-questions.md` 每个澄清问题附推荐
- 项目入口 `/Users/poco/Projects/kata/CLAUDE.md` + 规则 `.claude/rules/project-workflow-rules.md`

## 不能跨窗口丢失的关键决策

- P3 case-draft 已是 6 phase（source-intake / atomize / draft / spec-review / quality-review / output），不要回退到 5 phase
- helper 用 P2 真实接口 `openSession` / `decidePhase({step, workflow, skillDefaults})` / fake-orchestrator emit；**不**调用 `emitArtifactWritten`、**不**引入 spawn hook
- reviewer/worker frontmatter 只有 `name` 单字段
- 事件 jsonl 路径 `<root>/workspace/<project>/features/<featureId>/events/<runId>.jsonl`
- `event_kind`（不是 `kind`），validator_failed / blocked emit 必须 `status: 'failed'`
- blackboard-slots.json 真实路径 `.claude/contracts/schemas/blackboard-slots.json`
