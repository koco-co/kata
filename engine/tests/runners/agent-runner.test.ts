import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { validateHandoffEnvelope } from "../../src/policy/schema-guard.ts";
import { runPatchOnlyAgent } from "../../src/runners/agent-runner.ts";
import { snapshotFileRef } from "../../src/source-ref/resolvers.ts";

const PATCH = "diff --git a/workspace/demo/features/a.md b/workspace/demo/features/a.md\n";

function sourceEvidence(content = "Requirement A"): {
  sourceRef: string;
  sourceContents: Record<string, string>;
} {
  const sourceRef = snapshotFileRef({ id: "prd.file:demo", content });
  return { sourceRef, sourceContents: { [sourceRef]: content } };
}

describe("AgentRunner P0", () => {
  it("accepts patch-only handoff envelopes with source refs and stages patch artifact", async () => {
    const stagingRoot = mkdtempSync(join(tmpdir(), "kata-agent-runner-"));
    const patch = PATCH;
    const { sourceRef, sourceContents } = sourceEvidence();
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch,
      runId: "run-1",
      stagingRoot,
      sourceRefs: [sourceRef],
      sourceContents,
    });

    expect(result.ok).toBe(true);
    expect(result.value?.runner).toBe("worktree_patch");
    expect(result.value?.handoff.artifacts[0]).toEqual({
      path: ".kata/runs/run-1/artifacts/case-draft-worker_1.patch",
      kind: "patch",
    });
    expect(result.value?.handoff.provenance).toEqual({ sourceRefs: [sourceRef] });
    expect(
      existsSync(join(stagingRoot, ".kata/runs/run-1/artifacts/case-draft-worker_1.patch")),
    ).toBe(true);
    expect(
      readFileSync(
        join(stagingRoot, ".kata/runs/run-1/artifacts/case-draft-worker_1.patch"),
        "utf8",
      ),
    ).toBe(patch);
    expect(validateHandoffEnvelope(result.value?.handoff).ok).toBe(true);
  });

  it("rejects non-diff patch output", async () => {
    const { sourceRef, sourceContents } = sourceEvidence();
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: "summary only",
      sourceRefs: [sourceRef],
      sourceContents,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.patch_not_diff");
  });

  it("rejects patch output without source refs", async () => {
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      sourceRefs: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.source_refs_missing");
  });

  it("rejects runId path traversal before writing patch artifacts", async () => {
    const stagingRoot = mkdtempSync(join(tmpdir(), "kata-agent-runner-"));
    const { sourceRef, sourceContents } = sourceEvidence();
    const escapedPath = resolve(
      stagingRoot,
      ".kata/runs/../../../../escape/artifacts/case-draft-worker_1.patch",
    );
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      runId: "../../../../escape",
      stagingRoot,
      sourceRefs: [sourceRef],
      sourceContents,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.run_id_invalid");
    expect(existsSync(escapedPath)).toBe(false);
    expect(existsSync(dirname(escapedPath))).toBe(false);
  });

  it("rejects dot-segment runId before writing patch artifacts", async () => {
    const stagingRoot = mkdtempSync(join(tmpdir(), "kata-agent-runner-"));
    const { sourceRef, sourceContents } = sourceEvidence();
    const dotSegmentPath = join(stagingRoot, ".kata/artifacts/case-draft-worker_1.patch");
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      runId: "..",
      stagingRoot,
      sourceRefs: [sourceRef],
      sourceContents,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.run_id_invalid");
    expect(existsSync(dotSegmentPath)).toBe(false);
    expect(existsSync(dirname(dotSegmentPath))).toBe(false);
  });

  it("rejects non-canonical source refs", async () => {
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      sourceRefs: ["not-a-ref", "prd.file:demo#sha256:abc"],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.source_ref_invalid");
  });

  it("rejects malformed source refs without throwing", async () => {
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      sourceRefs: [{ raw: "x" }] as unknown as string[],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.source_ref_invalid");
  });

  it("validates handoff before writing patch artifacts", async () => {
    const stagingRoot = mkdtempSync(join(tmpdir(), "kata-agent-runner-"));
    const { sourceRef, sourceContents } = sourceEvidence();
    const stagedPatchPath = join(stagingRoot, ".kata/runs/run-1/artifacts/.patch");
    const result = await runPatchOnlyAgent({
      agentId: "",
      patch: PATCH,
      runId: "run-1",
      stagingRoot,
      sourceRefs: [sourceRef],
      sourceContents,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.handoff_invalid");
    expect(existsSync(stagedPatchPath)).toBe(false);
    expect(existsSync(dirname(stagedPatchPath))).toBe(false);
  });

  it("rejects unresolved canonical source refs", async () => {
    const sourceRef = snapshotFileRef({ id: "prd.file:demo", content: "Requirement A" });
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      sourceRefs: [sourceRef],
      sourceContents: {},
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("runner.source_ref_unresolved");
  });

  it("rejects fabricated or stale canonical source refs", async () => {
    const sourceRef =
      "prd.file:demo#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const result = await runPatchOnlyAgent({
      agentId: "case-draft-worker@1",
      patch: PATCH,
      sourceRefs: [sourceRef],
      sourceContents: { [sourceRef]: "Requirement A" },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("source_ref.stale_hash");
  });
});
