# Changelog

## Unreleased

### Changed
- BREAKING: 11 个 product skill 重命名为 `<domain>-<verb>` 形式（见 docs/superpowers/specs/2026-05-11-skill-rename-design.md）。所有 inputs/outputs 字段名同步压缩为极简形式。bug-file 输出从 html+markdown 两项合并为单一 `report`（格式由 schema 表示）。
- Changed: `case-draft` SourceRef 分层调整为最终 `archive.md`、`archive.draft.md`、`cases.xmind` 展示文本不得泄漏 `SourceRef`、`SR-*`、`csv::`、规范 SourceRef 字符串或来源行/CSV 定位符；出处保留在活跃 JSON/evidence 契约中：FeatureManifest@2 轻量 `case_drafting.requirement_atoms[].source_ref`、完整 RequirementAtom@1 `source_refs[]`、CaseEvidenceMap@1、CoverageMatrix@1，按各 schema 通过 `case_id` 与 `requirement_atom_ids` 对账。Lanhu/Axure error-fallback 的 confirmation/unresolved 产物继续按既有 hard_rules 豁免。

### Added

- New: `playwright-automation` skill 引入「阶段内任务编排」协议（execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt 四份 reference），在用户确认 env 且 env-preflight 无 blocker 后启用；TodoWrite 跟踪阶段推进、ui-probe/playwright-generate/self-run/repair-loop 重阶段派 fresh subagent、产物落盘后跑 spec→quality 二阶段审查。silent-mode、所有 BLOCKED 模板路径下该协议禁用。现有 60 条 hard_rules、silent-mode、env-preflight blocker 模板未变动（sha256 baseline 已 pin 在 `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`）。
- New: `case-draft` skill 引入阶段内任务编排 references：execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt；在 source-intake/module-identify 完成后启用，并避开 Lanhu/Axure error-fallback 与 silent forbidden paths。case-draft hard_rules baseline 已 pin 在 `engine/tests/ai-core/case-draft-hardrules-regression.test.ts`。
- New: `kata cases lint` 新增 `case-md-sourceref-leak`，检测最终展示产物中的 SourceRef 泄漏，覆盖 XMind attached child topics，同时避免把普通 CSV 业务文案误判为证据定位符。

## 4.0.0-alpha.2 (UNRELEASED)

### Phase 1 — PromptContract caching & model routing

- New: `PromptContract@1` 新增三个可选顶层字段 `cache_breakpoints` / `model_routing` / `model_id`，把 prompt caching 与 模型路由从 ad-hoc 注释抬升为契约级声明（零破坏，schema 仍 v1）。
- New: `engine/src/ai-core/prompt-cache-validator.ts` 提供 17 个错误码的深度校验（after 顺序递进、min_tokens 严格单调、最多 4 个 breakpoint、capability 匹配、model_id/model_routing 互斥等），接入 `contract-schema.ts` 与 `validate.ts` 双路。
- Changed: 全部 11 个 `.ai/core/prompts/*.prompt.yaml` 完成 routing 升级；4 个长上下文 prompt 额外配置双 segment cache breakpoints（system @1024 + context @4096）。

### Phase 2 — Behavioral evals via cassette LLM-as-judge

- New: `LLMJudgeEval.v1.schema.json` 注册到 schema registry；`.ai/core/evals/behavioral/{golden.json, fixtures/, cassettes/}` 目录骨架。
- New: engine 三模块 `cassette-store.ts` / `judge.ts` / `behavioral-evals.ts` + CLI；cassette 以 sha256(request) 命名 + `_lock.json` 防 drift（mirror projection-lock 策略）。
- New: reference case `case-draft-quality@1`，三条 rubric（source_ref 必填 / 未明确字段必须放 pending_items / few-shot 内容不得泄漏到产出），threshold 0.85，samples=3，majority 聚合。
- New: CI replay 模式默认运行；record 模式标注到 `environment-dependent-checks.json`。

### Phase 3 — Plugin worker_threads sandbox

- New: `engine/src/plugins/sandbox/{runner, capability-spec, secret-injector, entry-template}.ts` 与 `engine/src/policy/plugin-sandbox-policy.ts`，把 `plugin_policy.no_network_no_secret` 从合约声明升级到运行时强制。
- New: 三条沙盒策略 guard 注册并挂载 implementation：`plugin_policy.sandbox_isolation@1` / `plugin_policy.network_allowlist@1` / `plugin_policy.fs_capability@1`。
- Breaking: `PluginManifest@1` 的 `capability_required`（`fs_read` / `fs_write` / `net` / `secret_refs`）由 optional 升级为 required；`.ai/core/plugins/**` 下所有 manifest 必须显式声明能力清单。

## 4.0.0-alpha.0 (UNRELEASED)

- Breaking: starts the `.ai/core` source-of-truth migration for the P0 Kernel slice.
- Breaking: generated Claude and kata Codex runtime projections are checked for drift for the slice.
- New: AI Core schema registry, guard registry, projection renderer, vendor freeze path, P0 policy gates, SourceRef snapshots, PluginRunner, AgentRunner, and deterministic P0 evals.
- New: Phase 2 GA-core import gate for workspace management, test-case generation, case artifact maintenance, knowledge management, and Playwright CLI vendor projection.
- New: Phase 3 runtime strictness gate with projection lock, runtime preflight, local context audit, SourceRef expansion, secret refs, and GA-core runtime workflow contracts.
- New: projection inventory supports generated, copied vendor, local exception, legacy quarantined command, and deleted dispositions.
- New: non-core daily-task, static-scan, and ui-autotest are explicitly quarantined without `.ai/core` hard-boundary claims.
- Changed: temporary runtime local exceptions are removed or reduced to true user-local settings.
- Scope: alpha covers the P0 kernel contracts plus GA-core import/runtime contracts for workspace management, test-case generation, case artifact maintenance, knowledge management, and Playwright CLI vendor projection; non-core legacy workflows remain quarantined.

## 3.0.0-alpha.1 (2026-04-29)

### v3 Architecture Redesign

- **Engine lift**: `.claude/scripts/` → `engine/` as npm workspace package
- **Workspace reorg**: `prds/archive/xmind/` → `features/{ym}-{slug}/` aggregation
- **Testing**: migrated from `node:test` to `bun:test`, 966 pass / 0 fail / 0 errors
- **CLI tools**: bucket-audit, fix-truthy codemod, skills audit, paths audit, cases lint
- **Runtime audit**: Claude Code 与 Codex 双栈 runtime 设计与审计命令
- **Hooks**: 5 Claude Code hooks (pre-bash, pre-edit, post-edit × 3)
- **Skills**: 7 skills on 4-file contract (SKILL/workflow/rules/references)
- **Docs**: README/CLAUDE.md updated for v3 workspace layout

## 2.0.0 (2026-04-01)

- Initial release with Claude Code Skills integration
- QA workflow engine with test-case-gen, ui-autotest, case-format skills
- Plugin system (lanhu, zentao, notify)

<!-- ai-core:start release-summary -->
- Phase 4 AI Core hardening prepares GA-completion checks with generated documentation, runtime projection checks, schema guards, and deterministic eval gates.
- Claude and kata Codex runtime projections are generated from `.ai/core`; `.agents/**` is kata's internal Codex runtime projection, while root `AGENTS.md` is the public coding-agent convention file.
- Phase 5 closed the deterministic baseline failures; `.ai/core/evals/baseline-known-failures.json` now tracks deterministic failures only.
- Browser PDF integration is opt-in and environment-dependent, with the explicit check tracked in `.ai/core/evals/environment-dependent-checks.json`.
- 4.0.0-alpha.0 remains unreleased; Phase 4 is complete/prepared, and this generated summary does not claim final 4.0.0 GA.
<!-- ai-core:hash 8882f144871f857abc490ffa012142d3c14e5c517858c25bcf6194a8f8eb1fcb -->
<!-- ai-core:end release-summary -->
