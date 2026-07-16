import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  snapshotDesignScreenshotRef,
  snapshotFileRef,
  snapshotKnowledgeEntryRef,
} from "@shared/lib/source-ref/resolvers.ts";
import { parseSourceRef, resolveSourceRef } from "@shared/lib/source-ref.ts";

describe("canonical SourceRef parser and resolver", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-source-ref-"));
  const workspaceDir = join(tmp, "workspace");
  const projectName = "dataAssets";
  const featureDir = join(workspaceDir, projectName, "features", "2026-07-source-ref");
  mkdirSync(join(featureDir, "inputs"), { recursive: true });
  mkdirSync(join(workspaceDir, projectName, "_shared", "knowledge"), { recursive: true });
  writeFileSync(join(featureDir, "inputs", "prd.md"), "# Requirement\n");
  writeFileSync(join(featureDir, "inputs", "form.png"), "image bytes");
  writeFileSync(join(workspaceDir, projectName, "_shared", "knowledge", "terms.md"), "# terms\n");

  it("parses the single hash-backed protocol", () => {
    const ref = snapshotFileRef({ id: "prd.file:prd.md", content: "# Requirement\n" });
    expect(parseSourceRef(ref)).toEqual({
      kind: "prd.file",
      id: "prd.md",
      sha256: ref.split("#sha256:")[1],
    });
    expect(parseSourceRef("prd#section-1")).toBe(null);
  });

  it("resolves PRD, knowledge and screenshot refs", () => {
    const refs = [
      snapshotFileRef({ id: "prd.file:prd.md", content: "# Requirement\n" }),
      snapshotKnowledgeEntryRef({ id: "knowledge.entry:terms", content: "# terms\n" }),
      snapshotDesignScreenshotRef({ id: "design.screenshot:form.png", content: "image bytes" }),
    ];
    for (const ref of refs) {
      expect(resolveSourceRef(ref, { workspaceDir, projectName, featureDir }).ok).toBe(true);
    }
  });

  it("rejects stale content hashes", () => {
    const stale = snapshotFileRef({ id: "prd.file:prd.md", content: "old" });
    const result = resolveSourceRef(stale, { workspaceDir, projectName, featureDir });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("hash does not match");
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
