import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { rollbackAgentsSync, runAgentsSync } from "../../src/lint/agents-sync.ts";

const ROOT = join(tmpdir(), `kata-agents-sync-${process.pid}`);

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function writePolicy(allowedDiffs: unknown[]): void {
  write(
    join(ROOT, ".agents/drift-policy.json"),
    JSON.stringify({ version: 1, allowedDiffs }, null, 2),
  );
}

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("runAgentsSync", () => {
  test("dry-run does not write missing targets", () => {
    write(join(ROOT, ".claude/agents/foo-agent.md"), "claude agent\n");
    writePolicy([]);

    const result = runAgentsSync({ root: ROOT, from: "claude", to: "codex" });

    expect(result.dryRun).toBe(true);
    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "create",
        sourcePath: ".claude/agents/foo-agent.md",
        targetPath: ".agents/agents/foo-agent.md",
      }),
    );
    expect(existsSync(join(ROOT, ".agents/agents/foo-agent.md"))).toBe(false);
  });

  test("write creates missing targets", () => {
    write(join(ROOT, ".claude/skills/foo/SKILL.md"), "claude skill\n");
    writePolicy([]);

    const result = runAgentsSync({ root: ROOT, from: "claude", to: "codex", write: true });

    expect(result.dryRun).toBe(false);
    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "create",
        sourcePath: ".claude/skills/foo/SKILL.md",
        targetPath: ".agents/skills/foo/SKILL.md",
      }),
    );
    expect(read(join(ROOT, ".agents/skills/foo/SKILL.md"))).toBe("claude skill\n");
  });

  test("force refuses non-policy conflict and leaves target untouched", () => {
    write(join(ROOT, ".claude/agents/foo-agent.md"), "claude body\n");
    write(join(ROOT, ".agents/agents/foo-agent.md"), "codex body\n");
    writePolicy([]);

    const result = runAgentsSync({
      root: ROOT,
      from: "claude",
      to: "codex",
      write: true,
      force: true,
    });

    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "conflict",
        sourcePath: ".claude/agents/foo-agent.md",
        targetPath: ".agents/agents/foo-agent.md",
      }),
    );
    expect(result.backupId).toBeUndefined();
    expect(read(join(ROOT, ".agents/agents/foo-agent.md"))).toBe("codex body\n");
  });

  test("force applies literal replacement policy instead of hardcoded labels", () => {
    write(join(ROOT, ".claude/agents/reviewer-agent.md"), "Reviewer: Claude Reviewer\n");
    write(join(ROOT, ".agents/agents/reviewer-agent.md"), "Reviewer: Codex Reviewer\n");
    writePolicy([
      {
        id: "reviewer-runtime-label",
        paths: [".claude/agents/reviewer-agent.md", ".agents/agents/reviewer-agent.md"],
        kind: "literal-replacement",
        from: "Claude Reviewer",
        to: "Codex Reviewer",
        owner: "test",
      },
    ]);

    const result = runAgentsSync({
      root: ROOT,
      from: "claude",
      to: "codex",
      write: true,
      force: true,
    });

    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "overwrite",
        policyId: "reviewer-runtime-label",
        targetPath: ".agents/agents/reviewer-agent.md",
      }),
    );
    expect(read(join(ROOT, ".agents/agents/reviewer-agent.md"))).toBe("Reviewer: Codex Reviewer\n");
  });

  test("force allowed overwrite creates backup and rollback restores previous content", () => {
    const sourcePath = ".claude/skills/foo/SKILL.md";
    const targetPath = ".agents/skills/foo/SKILL.md";
    write(join(ROOT, sourcePath), "See .claude/skills/foo/workflow.md\n");
    write(join(ROOT, targetPath), "See .agents/skills/foo/workflow.md\n");
    writePolicy([
      {
        id: "skill-path-prefix",
        paths: [".claude/skills/foo/**", ".agents/skills/foo/**"],
        kind: "path-prefix-replacement",
        from: ".claude/skills/",
        to: ".agents/skills/",
        owner: "test",
      },
    ]);

    const result = runAgentsSync({
      root: ROOT,
      from: "claude",
      to: "codex",
      write: true,
      force: true,
    });

    expect(result.backupId).toBeDefined();
    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "overwrite",
        policyId: "skill-path-prefix",
        sourcePath,
        targetPath,
      }),
    );
    expect(read(join(ROOT, targetPath))).toBe("See .agents/skills/foo/workflow.md\n");

    const manifestPath = join(ROOT, ".kata/agent-sync-backups", result.backupId!, "manifest.json");
    const manifest = JSON.parse(read(manifestPath)) as {
      entries: Array<{
        targetPath: string;
        backupPath: string;
        beforeHash: string;
        afterHash: string;
      }>;
    };
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toEqual(
      expect.objectContaining({
        targetPath,
        backupPath: `.kata/agent-sync-backups/${result.backupId}/target/${targetPath}`,
      }),
    );
    expect(manifest.entries[0].beforeHash).toStartWith("sha256:");
    expect(manifest.entries[0].afterHash).toStartWith("sha256:");
    expect(read(join(ROOT, manifest.entries[0].backupPath))).toBe(
      "See .agents/skills/foo/workflow.md\n",
    );

    write(join(ROOT, targetPath), "manual edit after sync\n");
    expect(() => rollbackAgentsSync({ root: ROOT, backupId: result.backupId! })).toThrow(
      "current hash",
    );

    rollbackAgentsSync({ root: ROOT, backupId: result.backupId!, force: true });

    expect(read(join(ROOT, targetPath))).toBe("See .agents/skills/foo/workflow.md\n");
  });

  test("force does not overwrite when target is not the policy-transformed source", () => {
    write(join(ROOT, ".claude/agents/reviewer-agent.md"), "Reviewer: Claude Reviewer\n");
    write(join(ROOT, ".agents/agents/reviewer-agent.md"), "manual codex edit\n");
    writePolicy([
      {
        id: "reviewer-runtime-label",
        paths: [".claude/agents/reviewer-agent.md", ".agents/agents/reviewer-agent.md"],
        kind: "literal-replacement",
        from: "Claude Reviewer",
        to: "Codex Reviewer",
        owner: "test",
      },
    ]);

    const result = runAgentsSync({
      root: ROOT,
      from: "claude",
      to: "codex",
      write: true,
      force: true,
    });

    expect(result.actions).toContainEqual(
      expect.objectContaining({
        action: "conflict",
        status: "conflict",
        targetPath: ".agents/agents/reviewer-agent.md",
      }),
    );
    expect(result.backupId).toBeUndefined();
    expect(read(join(ROOT, ".agents/agents/reviewer-agent.md"))).toBe("manual codex edit\n");
  });

  test("rollback rejects backup id traversal", () => {
    write(
      join(ROOT, ".kata/manifest.json"),
      JSON.stringify({ version: 1, backupId: "..", entries: [] }),
    );

    expect(() => rollbackAgentsSync({ root: ROOT, backupId: "../.." })).toThrow(
      "Invalid backup id",
    );
  });

  test("rollback rejects manifest path traversal", () => {
    const backupId = "2026-05-06T04-00-00-000Z-123-1";
    write(
      join(ROOT, ".kata/agent-sync-backups", backupId, "manifest.json"),
      JSON.stringify({
        version: 1,
        backupId,
        createdAt: "2026-05-06T04:00:00.000Z",
        entries: [
          {
            targetPath: "../outside.md",
            backupPath: `.kata/agent-sync-backups/${backupId}/target/.agents/foo.md`,
            beforeHash: "sha256:before",
            afterHash: "sha256:after",
          },
        ],
      }),
    );

    expect(() => rollbackAgentsSync({ root: ROOT, backupId })).toThrow(
      "Invalid manifest targetPath",
    );
  });

  test("rollback rejects backup paths outside the backup directory", () => {
    const backupId = "2026-05-06T04-00-00-000Z-123-2";
    write(join(ROOT, ".agents/foo.md"), "after\n");
    write(
      join(ROOT, ".kata/agent-sync-backups", backupId, "manifest.json"),
      JSON.stringify({
        version: 1,
        backupId,
        createdAt: "2026-05-06T04:00:00.000Z",
        entries: [
          {
            targetPath: ".agents/foo.md",
            backupPath: ".kata/agent-sync-backups/other/target/.agents/foo.md",
            beforeHash: "sha256:before",
            afterHash: "sha256:7c40b5c762b6eb2d40bc0f6d6b69f39ae7b3a91dbac30ea4b31a6dbc9e220f95",
          },
        ],
      }),
    );

    expect(() => rollbackAgentsSync({ root: ROOT, backupId })).toThrow(
      "Invalid manifest backupPath",
    );
  });
});
