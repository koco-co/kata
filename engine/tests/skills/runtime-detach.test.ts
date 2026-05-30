import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  checkRuntimeDetach,
  formatRuntimeDetachReport,
} from "@shared/lib/skills/runtime-detach.ts";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-runtime-detach-"));
  tempRoots.push(root);
  return root;
}

function writeRuntimeFile(root: string, rel: string, body: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

function writeDetachedEntries(root: string): void {
  const shared = [
    "Claude 与 Codex 同等优先。",
    "修改任一 runtime 必须同步评估另一套。",
    "不要求两边文件逐字一致。",
    "优先使用 symlink 保持单一文件来源。",
    "不得抽取到第三方共享文档目录。",
    "代码变动前先提交主工作树现有改动。",
    "使用 git worktree add --detach 创建 detached worktree。",
    "不得为任务新建分支。",
    "worktree 创建后 symlink 必要 ignored runtime 目录。",
    "通过 git merge --no-ff <sha> 合入 main。",
    "无问题后 git push origin main。",
    "最后 git worktree remove .worktrees/<slug>。",
    "多任务默认使用 superpowers:subagent-driven-development。",
    "Claude Code 使用 TaskCreate/TaskUpdate，Codex 使用 update_plan。",
    "Commit 映射固定包含 refactor: ✨。",
    "临时通知页面标题为【KATA 工作通知】。",
  ].join("\n");
  writeRuntimeFile(root, "AGENTS.md", `# AGENTS.md\n\n${shared}\n`);
  writeRuntimeFile(root, "CLAUDE.md", `# CLAUDE.md\n\n${shared}\n`);
  writeWorkflowRuleFiles(
    root,
    [
      "# Rules",
      "代码变动前先提交主工作树现有改动。",
      "使用 git worktree add --detach 创建 detached worktree。",
      "不得为任务新建分支。",
      "worktree 创建后 symlink 必要 ignored runtime 目录。",
      "通过 git merge --no-ff <sha> 合入 main。",
      "无问题后 git push origin main。",
      "最后 git worktree remove .worktrees/<slug>。",
      "多任务默认使用 superpowers:subagent-driven-development。",
      "Claude Code 使用 TaskCreate/TaskUpdate，Codex 使用 update_plan。",
      "| `refactor` | `✨` |",
      "临时通知页面标题为【KATA 工作通知】。",
    ].join("\n"),
  );
}

function writeLegacyDetachedEntries(root: string): void {
  const shared = [
    "Claude 与 Codex 同等优先。",
    "修改任一 runtime 必须同步评估另一套。",
    "不要求两边文件逐字一致。",
    "优先使用 symlink 保持单一文件来源。",
    "不得抽取到第三方共享文档目录。",
  ].join("\n");
  writeRuntimeFile(root, "AGENTS.md", `# AGENTS.md\n\n${shared}\n`);
  writeRuntimeFile(root, "CLAUDE.md", `# CLAUDE.md\n\n${shared}\n`);
}

function writeWorkflowRuleFiles(root: string, body: string): void {
  // Phase 1: only .claude/rules/* is enforced; .agents/rules/* was retired.
  writeRuntimeFile(root, `.claude/rules/project-workflow-rules.md`, body);
  writeRuntimeFile(root, `.claude/rules/git-workflow.md`, body);
}

function writeSkill(
  root: string,
  runtimeDir: ".claude" | ".agents",
  name: string,
  body = "",
): void {
  writeRuntimeFile(
    root,
    `${runtimeDir}/skills/${name}/SKILL.md`,
    `---\nname: ${name}\ndescription: example\n---\n# ${name}\n${body}\n`,
  );
}

describe("runtime detach check", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes detached runtime entries and clean skills", () => {
    const root = makeRoot();
    writeDetachedEntries(root);
    writeRuntimeFile(root, ".claude/INDEX.md", "# Claude index\n");
    writeRuntimeFile(root, ".agents/INDEX.md", "# Codex index\n");
    writeSkill(root, ".claude", "case-draft");
    writeSkill(root, ".agents", "case-draft");
    writeRuntimeFile(
      root,
      ".agents/skills/case-draft/references/fewshots/case-format-sample.md",
      "# Case format sample\n\nUse readable archive fields.\n",
    );

    const report = checkRuntimeDetach(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
    expect(formatRuntimeDetachReport(report, root)).toBe("runtime detach passed");
  });

  test("flags CLAUDE.md symlink and CLAUDE.local.md", () => {
    const root = makeRoot();
    writeRuntimeFile(root, "AGENTS.md", "# AGENTS.md\n");
    symlinkSync("AGENTS.md", join(root, "CLAUDE.md"));
    writeRuntimeFile(root, "CLAUDE.local.md", "# local\n");

    const report = checkRuntimeDetach(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "RUNTIME_ENTRY_SYMLINK")).toBe(true);
    expect(report.violations.some((v) => v.rule === "RUNTIME_LOCAL_ENTRY_PRESENT")).toBe(true);
  });

  test("flags missing synchronization rule in entry files", () => {
    const root = makeRoot();
    writeRuntimeFile(root, "AGENTS.md", "# AGENTS.md\n");
    writeRuntimeFile(root, "CLAUDE.md", "# CLAUDE.md\n");

    const report = checkRuntimeDetach(root);
    expect(report.violations.some((v) => v.rule === "RUNTIME_SYNC_RULE_MISSING")).toBe(true);
  });

  test("flags missing code-change workflow guardrails in entry files", () => {
    const root = makeRoot();
    writeLegacyDetachedEntries(root);

    const report = checkRuntimeDetach(root);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_RULE_MISSING",
        path: join(root, "AGENTS.md"),
      }),
    );
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_RULE_MISSING",
        path: join(root, "CLAUDE.md"),
      }),
    );
  });

  test("flags missing code-change workflow guardrails in detailed rule files", () => {
    const root = makeRoot();
    writeDetachedEntries(root);
    writeWorkflowRuleFiles(root, "# Rules\n\nOnly old worktree guidance.\n");

    const report = checkRuntimeDetach(root);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_RULE_MISSING",
        path: join(root, ".claude/rules/project-workflow-rules.md"),
      }),
    );
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_RULE_MISSING",
        path: join(root, ".claude/rules/git-workflow.md"),
      }),
    );
  });

  test("flags generated markers and active retired source references", () => {
    const root = makeRoot();
    writeDetachedEntries(root);
    writeRuntimeFile(
      root,
      ".agents/skills/case-edit/SKILL.md",
      [
        "---",
        "name: case-edit",
        "description: example",
        "---",
        "<!-- generated by kata legacy runtime; do not edit -->",
        "<!-- legacy-runtime-hash: abc123 -->",
        "详见 legacy-runtime-source/skills/case-draft/references/retired-format.md",
      ].join("\n"),
    );

    const report = checkRuntimeDetach(root);
    expect(report.violations.some((v) => v.rule === "RUNTIME_GENERATED_MARKER")).toBe(true);
    expect(report.violations.some((v) => v.rule === "RUNTIME_RETIRED_SOURCE_REFERENCE")).toBe(true);
  });

  test("flags active retired source references in nested skill reference markdown", () => {
    const root = makeRoot();
    writeDetachedEntries(root);
    writeRuntimeFile(
      root,
      ".agents/skills/case-draft/references/fewshots/case-format-sample.md",
      "# Case format sample\n\nSSOT: legacy-runtime-source/skills/case-draft/references/retired-format.md\n",
    );

    const report = checkRuntimeDetach(root);
    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_RETIRED_SOURCE_REFERENCE",
        path: join(root, ".agents/skills/case-draft/references/fewshots/case-format-sample.md"),
      }),
    );
  });

  test("formats detach failures with relative paths", () => {
    const root = makeRoot();
    writeRuntimeFile(root, "AGENTS.md", "# AGENTS.md\n");
    writeRuntimeFile(root, "CLAUDE.md", "# CLAUDE.md\n");

    const text = formatRuntimeDetachReport(checkRuntimeDetach(root), root);
    expect(text).toContain("runtime detach failed");
    expect(text).toContain("AGENTS.md");
  });
});
