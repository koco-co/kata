import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STABLE_CORE_ARTIFACTS, verifyCoverageHoles, verifyL1Structure, verifyL2Inputs, verifyL3Quality, verifyStableCoreArtifacts, verifyStructuredSchemas } from "../../src/cases/verify-layers.ts";

const SHA = "a".repeat(64);
const atom = (id: string, ref: string) => ({ id, source_ref: ref, ambiguity_class: "confirmed", confidence: "high" });
const completedManifest = {
  schema: "FeatureManifest@2",
  feature_id: "2026-05-lt-dq",
  case_drafting: {
    status: "completed",
    archive_path: "archive.md",
    xmind_path: "cases.xmind",
    coverage_matrix_path: "coverage-matrix.json",
    requirement_atoms: [
      atom("RA-1", `lanhu.fixture:form#sha256:${SHA}`),
      atom("RA-2", `knowledge.entry:terms#sha256:${SHA}`),
      atom("RA-3", `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}`),
    ],
  },
  automation: { status: "not-started", intents: [], last_handoff_path: null, last_run_status: "not-run" },
  files: { archive: "archive.md", xmind: "cases.xmind", tests_root: null, latest_results: null },
};

describe("verifyL1Structure", () => {
  it("fails when manifest violates schema", () => {
    const bad = { ...completedManifest, case_drafting: { ...completedManifest.case_drafting, requirement_atoms: [] } };
    const issues = verifyL1Structure({ manifest: bad, archiveMd: "# A", featureDir: "/x" });
    expect(issues.some((i) => i.layer === "L1" && i.rule === "manifest_schema_invalid")).toBe(true);
  });
  it("fails on SourceRef leak in human-readable archive", () => {
    const issues = verifyL1Structure({ manifest: completedManifest, archiveMd: "step refs SR-001 and csv::row", featureDir: "/x" });
    expect(issues.some((i) => i.rule === "sourceref_leak")).toBe(true);
  });
  it("passes a clean completed artifact", () => {
    const issues = verifyL1Structure({ manifest: completedManifest, archiveMd: "# Cases\n- step / expected", featureDir: "/x" });
    expect(issues).toHaveLength(0);
  });
});

describe("verifyL2Inputs", () => {
  it("fails when required kinds are not all covered", () => {
    const onlyLanhu = { ...completedManifest, case_drafting: { ...completedManifest.case_drafting, requirement_atoms: [{ id: "RA-1", source_ref: `lanhu.fixture:f#sha256:${SHA}` }] } };
    const issues = verifyL2Inputs({ manifest: onlyLanhu, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: () => ({ found: true, content: "x" }) });
    expect(issues.some((i) => i.layer === "L2" && i.rule === "required_input_uncovered" && i.message.includes("knowledge.entry"))).toBe(true);
  });
  it("fails when a ref does not resolve to a real target", () => {
    const issues = verifyL2Inputs({ manifest: completedManifest, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: (ref) => ({ found: !ref.startsWith("repo.line") }) });
    expect(issues.some((i) => i.rule === "source_ref_unresolved" && i.message.includes("repo.line"))).toBe(true);
  });
  it("passes when all kinds covered and resolvable", () => {
    const issues = verifyL2Inputs({ manifest: completedManifest, requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"], resolve: () => ({ found: true, content: "x" }) });
    expect(issues).toHaveLength(0);
  });
});

describe("verifyL3Quality", () => {
  it("fails when a case has no atom traceability", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: [], steps: ["s"], expected: "e", title: "t" }], atomIds: ["RA-1"] });
    expect(issues.some((i) => i.layer === "L3" && i.rule === "case_untraceable")).toBe(true);
  });
  it("fails when a case has empty steps or expected", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: ["RA-1"], steps: [], expected: "", title: "t" }], atomIds: ["RA-1"] });
    expect(issues.some((i) => i.rule === "case_incomplete")).toBe(true);
  });
  it("passes a complete traceable case", () => {
    const issues = verifyL3Quality({ cases: [{ case_id: "C1", requirement_atom_ids: ["RA-1"], steps: ["click"], expected: "ok", title: "Login" }], atomIds: ["RA-1"] });
    expect(issues).toHaveLength(0);
  });
});

describe("verifyStableCoreArtifacts", () => {
  it("fails when a completed feature is missing a stable-core artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-core-"));
    try {
      for (const f of ["manifest.json", "metadata.yaml", "archive.md"]) writeFileSync(join(dir, f), "x");
      const issues = verifyStableCoreArtifacts({ featureDir: dir, status: "completed" });
      expect(issues.some((i) => i.layer === "L1" && i.rule === "stable_core_missing" && i.message.includes("cases.xmind"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("passes when all stable-core artifacts exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-core-"));
    try {
      for (const f of STABLE_CORE_ARTIFACTS) writeFileSync(join(dir, f), "x");
      expect(verifyStableCoreArtifacts({ featureDir: dir, status: "completed" })).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("skips the core-set check on the blocking (non-completed) path", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-core-"));
    try {
      writeFileSync(join(dir, "manifest.json"), "x");
      expect(verifyStableCoreArtifacts({ featureDir: dir, status: "blocked" })).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("verifyStructuredSchemas", () => {
  const validSnapshot = {
    schema: "FeatureSourceSnapshot@1", feature_id: "2026-05-lt-dq",
    lanhu: { url: "https://lanhuapp.com/x", page_id: "p1" },
    confirmed_source_repos: [{ group: "g", project: "dt-insight-studio", branch: "main", role: "frontend" }],
    knowledge_refs: ["terms"],
  };
  const validCoverage = [{ schema_ref: "CoverageMatrix@1", id: "CM-1", title: "t", coverage_type: "functional", requirement_atom_ids: ["RA-1"], risk_level: "high", evidence_status: "covered", manual_case_allowed: true, automation_allowed: true }];
  const validMetadata = "schema: FeatureMetadata@1\nid: 2026-05-lt-dq\ndisplay_name: LT\nstatus: active\ncreated_at: '2026-05-23'\nupdated_at: '2026-05-23'\nmodules: [dq]\ncustomers: []\nversions: []\nowners: [qa]\ninputs: [{kind: lanhu, ref: 'https://lanhuapp.com/x'}]\nrelates_to: []\nemits: {}\n";

  function seedStructured(overrides: { snapshot?: unknown; coverage?: unknown; metadata?: string }) {
    const dir = mkdtempSync(join(tmpdir(), "kata-struct-"));
    writeFileSync(join(dir, "metadata.yaml"), overrides.metadata ?? validMetadata);
    writeFileSync(join(dir, "source-snapshot.json"), JSON.stringify(overrides.snapshot ?? validSnapshot));
    writeFileSync(join(dir, "coverage-matrix.json"), JSON.stringify(overrides.coverage ?? validCoverage));
    return dir;
  }

  it("passes when all structured files match their schemas", () => {
    const dir = seedStructured({});
    try {
      expect(verifyStructuredSchemas({ featureDir: dir, status: "completed" })).toHaveLength(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("fails when source-snapshot.json violates FeatureSourceSnapshot@1 (repo missing branch)", () => {
    const dir = seedStructured({ snapshot: { schema: "FeatureSourceSnapshot@1", feature_id: "2026-05-lt-dq", lanhu: { url: "u", page_id: "p1" }, confirmed_source_repos: [{ group: "g", project: "p" }], knowledge_refs: [] } });
    try {
      const issues = verifyStructuredSchemas({ featureDir: dir, status: "completed" });
      expect(issues.some((i) => i.layer === "L1" && i.rule === "structured_schema_invalid" && i.message.includes("source-snapshot.json"))).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("fails when coverage-matrix.json is not an array", () => {
    const dir = seedStructured({ coverage: { schema_ref: "CoverageMatrix@1" } });
    try {
      const issues = verifyStructuredSchemas({ featureDir: dir, status: "completed" });
      expect(issues.some((i) => i.rule === "structured_schema_invalid" && i.message.includes("数组"))).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("skips on the non-completed path", () => {
    const dir = seedStructured({ snapshot: { bogus: true } });
    try {
      expect(verifyStructuredSchemas({ featureDir: dir, status: "blocked" })).toHaveLength(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("verifyCoverageHoles", () => {
  it("flags a requirement_atom with no covering coverage row", () => {
    const issues = verifyCoverageHoles({ coverageRows: [{ id: "CM-1", requirement_atom_ids: ["RA-1"], evidence_status: "covered" }], atomIds: ["RA-1", "RA-2"] });
    expect(issues.some((i) => i.layer === "L3" && i.rule === "coverage_hole" && i.message.includes("RA-2"))).toBe(true);
  });
  it("flags a coverage row whose evidence_status is uncovered", () => {
    const issues = verifyCoverageHoles({ coverageRows: [{ id: "CM-1", requirement_atom_ids: ["RA-1"], evidence_status: "uncovered" }], atomIds: ["RA-1"] });
    expect(issues.some((i) => i.rule === "coverage_uncovered" && i.message.includes("CM-1"))).toBe(true);
  });
  it("passes when every atom is covered and all rows carry evidence", () => {
    const issues = verifyCoverageHoles({ coverageRows: [{ id: "CM-1", requirement_atom_ids: ["RA-1", "RA-2"], evidence_status: "covered" }], atomIds: ["RA-1", "RA-2"] });
    expect(issues).toHaveLength(0);
  });
});
