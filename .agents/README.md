# Codex runtime (Phase 2 placeholder)

当前仓库只完整维护 Claude Code runtime（`.claude/`）。

Codex runtime 适配排到 Phase 2（详见 `docs/superpowers/specs/2026-05-28-kata-arch-overhaul-design.md` §4）：
- 本目录下 `skills/<id>/` 当前仍是 Phase 1 旧 SKILL.md 副本，**不保证可用**。
- Phase 2 会改写 `.agents/skills/<id>/SKILL.md` 适配 Codex frontmatter，并把 `phases/`、`reviewers/`、`workers/`、`rules/`、`fewshots/` 通过 symlink 共享 `.claude/skills/<id>/`。
- 任何对 runtime-neutral 契约（event schema、blackboard schema、workflow contract、plugin manifest）的引用，都应使用 `.claude/contracts/` 单源。

在 Phase 2 完成前，不要把 `.agents/skills/` 当作可路由 skill 来源。
