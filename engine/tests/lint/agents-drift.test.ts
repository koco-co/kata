import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditAgentRuntimeDrift } from "../../src/lint/agents-drift.ts";

const ROOT = join(tmpdir(), `kata-agents-drift-${process.pid}`);

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("auditAgentRuntimeDrift", () => {
  test("reports files missing from codex runtime", () => {
    write(join(ROOT, ".claude/skills/foo/SKILL.md"), "claude\n");
    write(
      join(ROOT, ".agents/drift-policy.json"),
      JSON.stringify({ version: 1, allowedDiffs: [] }),
    );

    const report = auditAgentRuntimeDrift(ROOT);

    expect(report.version).toBe(1);
    expect(report.pairs.some((p) => p.kind === "skill" && p.status === "missing-target")).toBe(
      true,
    );
  });

  test("classifies literal replacement as allowed-diff", () => {
    write(join(ROOT, ".claude/skills/ui-plan/SKILL.md"), "Claude Task\n");
    write(join(ROOT, ".agents/skills/ui-plan/SKILL.md"), "Codex Task\n");
    write(
      join(ROOT, ".agents/drift-policy.json"),
      JSON.stringify({
        version: 1,
        allowedDiffs: [
          {
            id: "ui-plan-task-label",
            paths: [".claude/skills/ui-plan/SKILL.md", ".agents/skills/ui-plan/SKILL.md"],
            kind: "literal-replacement",
            from: "Claude Task",
            to: "Codex Task",
            owner: "ui-plan",
          },
        ],
      }),
    );

    const report = auditAgentRuntimeDrift(ROOT);
    const pair = report.pairs.find((p) => p.name === "ui-plan/SKILL.md");
    expect(pair?.status).toBe("allowed-diff");
    expect(pair?.policyId).toBe("ui-plan-task-label");
  });

  test("classifies non-policy differences as conflict", () => {
    write(join(ROOT, ".claude/agents/foo-agent.md"), "claude body\n");
    write(join(ROOT, ".agents/agents/foo-agent.md"), "codex body\n");
    write(
      join(ROOT, ".agents/drift-policy.json"),
      JSON.stringify({ version: 1, allowedDiffs: [] }),
    );

    const report = auditAgentRuntimeDrift(ROOT);
    const pair = report.pairs.find((p) => p.name === "foo-agent.md");
    expect(pair?.status).toBe("conflict");
  });

  test("does not match wildcard policy paths across sibling prefixes", () => {
    write(join(ROOT, ".claude/skills/foo-extra/SKILL.md"), "Claude Task\n");
    write(join(ROOT, ".agents/skills/foo-extra/SKILL.md"), "Codex Task\n");
    write(
      join(ROOT, ".agents/drift-policy.json"),
      JSON.stringify({
        version: 1,
        allowedDiffs: [
          {
            id: "foo-only",
            paths: [".claude/skills/foo/**", ".agents/skills/foo/**"],
            kind: "literal-replacement",
            from: "Claude Task",
            to: "Codex Task",
            owner: "test",
          },
        ],
      }),
    );

    const report = auditAgentRuntimeDrift(ROOT);
    const pair = report.pairs.find((p) => p.name === "foo-extra/SKILL.md");
    expect(pair?.status).toBe("conflict");
  });
});
