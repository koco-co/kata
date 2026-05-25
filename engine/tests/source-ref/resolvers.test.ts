import { describe, expect, it } from "bun:test";
import {
  isCanonicalSourceRef,
  snapshotCaseArchiveRef,
  snapshotCommandOutputRef,
  snapshotFileRef,
  snapshotKnowledgeEntryRef,
  snapshotLanhuFixtureRef,
  snapshotRepoLineRef,
  snapshotWorkspaceConfigRef,
  validateSourceRefFreshness,
} from "../../src/source-ref/resolvers.ts";

describe("SourceRef P0 resolvers", () => {
  it("creates a hash-backed PRD file ref and blocks stale hashes", () => {
    const ref = snapshotFileRef({ id: "prd.file:demo", content: "Requirement A" });

    expect(ref).toMatch(/^prd\.file:demo#sha256:[a-f0-9]{64}$/);
    expect(ref).toContain("sha256:");
    expect(validateSourceRefFreshness(ref, "Requirement A").ok).toBe(true);
    expect(validateSourceRefFreshness(ref, "Changed").ok).toBe(false);
  });

  it("rejects invalid PRD file ids while minting source refs", () => {
    expect(() =>
      snapshotFileRef({ id: "http://example.test/raw", content: "Requirement A" }),
    ).toThrow("Invalid PRD file SourceRef id");
    expect(() => snapshotFileRef({ id: "prd.file::demo", content: "Requirement A" })).toThrow(
      "Invalid PRD file SourceRef id",
    );
  });

  it("creates a hash-backed command output ref", () => {
    const ref = snapshotCommandOutputRef({
      id: "command.output:test-run",
      content: "12 pass\n0 fail\n",
    });

    expect(ref).toContain("sha256:");
    expect(validateSourceRefFreshness(ref, "12 pass\n0 fail\n").ok).toBe(true);
  });

  it("rejects invalid command output ids while minting source refs", () => {
    expect(() =>
      snapshotCommandOutputRef({ id: "prd.file:test-run", content: "12 pass\n0 fail\n" }),
    ).toThrow("Invalid command output SourceRef id");
    expect(() =>
      snapshotCommandOutputRef({ id: "command.output:-run", content: "12 pass\n0 fail\n" }),
    ).toThrow("Invalid command output SourceRef id");
  });

  it("rejects unsupported source ref schemes even with a matching hash", () => {
    const hash = snapshotFileRef({ id: "prd.file:demo", content: "Requirement A" }).split(
      "#sha256:",
    )[1];
    const result = validateSourceRefFreshness(
      `http://example.test/raw#sha256:${hash}`,
      "Requirement A",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("source_ref.scheme_unsupported");
  });

  it("rejects malformed source ref hashes", () => {
    const result = validateSourceRefFreshness("prd.file:demo#sha256:not-a-hash", "Requirement A");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("source_ref.hash_invalid");
  });

  it("rejects non-string source refs without throwing", () => {
    const result = validateSourceRefFreshness({ raw: "x" } as unknown as string, "Requirement A");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("source_ref.invalid_type");
  });

  it("supports GA-core resolver schemes", () => {
    const refs = [
      snapshotKnowledgeEntryRef({
        id: "knowledge.entry:dataAssets.core",
        content: "Business fact",
      }),
      snapshotRepoLineRef({
        id: "repo.line:frontend.src.index:10",
        content: "export const value = 1;",
      }),
      snapshotCaseArchiveRef({
        id: "case.archive:dataAssets.login",
        content: "| case | expected |",
      }),
      snapshotWorkspaceConfigRef({
        id: "workspace.config:dataAssets",
        content: '{"projects":{"dataAssets":{}}}',
      }),
      snapshotLanhuFixtureRef({ id: "lanhu.fixture:login-page", content: "# fixture" }),
    ];
    for (const ref of refs) {
      expect(isCanonicalSourceRef(ref)).toBe(true);
    }
  });

  it("supports repo.line refs that include confirmed group/project/branch identity", () => {
    const ref = snapshotRepoLineRef({
      id: "repo.line:customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc:src/x.ts:10",
      content: "export const value = 1;",
    });

    expect(isCanonicalSourceRef(ref)).toBe(true);
  });

  it("rejects malformed GA-core resolver ids while minting source refs", () => {
    expect(() =>
      snapshotKnowledgeEntryRef({ id: "knowledge.entry::bad", content: "Business fact" }),
    ).toThrow("Invalid knowledge entry SourceRef id");
    expect(() =>
      snapshotRepoLineRef({ id: "repo.line:-bad", content: "export const value = 1;" }),
    ).toThrow("Invalid repo line SourceRef id");
  });
});
