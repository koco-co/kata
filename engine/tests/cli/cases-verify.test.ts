import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesVerify } from "@shared/cli/cases-verify.ts";

const SHA = "a".repeat(64);

describe("runCasesVerify", () => {
  let ws: string;
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-verify-")), "workspace");
    mkdirSync(join(ws, "dataAssets/_shared/knowledge"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/_shared/knowledge/terms.md"), "# terms\n");
    mkdirSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src/x.ts"), "x\n");
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  function seed(featureId: string, manifest: object, archive: string) {
    const dir = join(ws, "dataAssets/features", featureId);
    mkdirSync(join(dir, "inputs"), { recursive: true });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(join(dir, "archive.md"), archive);
    writeFileSync(
      join(dir, "metadata.yaml"),
      [
        "schema: FeatureMetadata@1",
        `id: ${featureId}`,
        "display_name: seed",
        "status: active",
        "created_at: '2026-05-23'",
        "updated_at: '2026-05-23'",
        "modules: [dq]",
        "customers: []",
        "versions: []",
        "owners: [qa]",
        "inputs: [{kind: lanhu, ref: 'https://lanhuapp.com/x'}]",
        "relates_to: []",
        "emits: {}",
        "",
      ].join("\n"),
    );
    writeFileSync(join(dir, "cases.xmind"), "PK");
    mkdirSync(join(dir, ".process"), { recursive: true });
    writeFileSync(
      join(dir, ".process", "source-snapshot.json"),
      JSON.stringify(
        {
          schema: "FeatureSourceSnapshot@1",
          feature_id: featureId,
          lanhu: { url: "https://lanhuapp.com/x", page_id: "p1" },
          confirmed_source_repos: [
            { group: "customltem", project: "dt-insight-studio", branch: "main", role: "frontend" },
          ],
          knowledge_refs: ["terms"],
        },
        null,
        2,
      ),
    );
    writeFileSync(
      join(dir, ".process", "coverage-matrix.json"),
      JSON.stringify(
        [
          {
            schema_ref: "CoverageMatrix@1",
            id: "CM-1",
            title: "cov",
            coverage_type: "functional",
            requirement_atom_ids: ["RA-1", "RA-2", "RA-3"],
            risk_level: "high",
            evidence_status: "covered",
            manual_case_allowed: true,
            automation_allowed: true,
          },
        ],
        null,
        2,
      ),
    );
    return dir;
  }

  it("fails L2 when knowledge/source inputs are missing", async () => {
    seed(
      "2026-05-lt-dq",
      {
        schema: "FeatureManifest@2",
        feature_id: "2026-05-lt-dq",
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          xmind_path: "cases.xmind",
          coverage_matrix_path: "coverage-matrix.json",
          requirement_atoms: [
            {
              id: "RA-1",
              source_ref: `lanhu.fixture:f#sha256:${SHA}`,
              ambiguity_class: "confirmed",
              confidence: "high",
            },
          ],
        },
        automation: {
          status: "not-started",
          intents: [],
          last_handoff_path: null,
          last_run_status: "not-run",
        },
        files: {
          archive: "archive.md",
          xmind: "cases.xmind",
          tests_root: null,
          latest_results: null,
        },
      },
      "# Cases\n",
    );
    const r = await runCasesVerify({
      project: "dataAssets",
      featureId: "2026-05-lt-dq",
      workspaceRoot: ws,
      requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"],
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.layer === "L2" && i.rule === "required_input_uncovered")).toBe(
      true,
    );
  });

  it("returns ok for a complete, traceable artifact", async () => {
    const atom = (id: string, ref: string) => ({
      id,
      source_ref: ref,
      ambiguity_class: "confirmed",
      confidence: "high",
    });
    seed(
      "2026-05-ok",
      {
        schema: "FeatureManifest@2",
        feature_id: "2026-05-ok",
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          xmind_path: "cases.xmind",
          coverage_matrix_path: "coverage-matrix.json",
          requirement_atoms: [
            atom("RA-1", `lanhu.fixture:f#sha256:${SHA}`),
            atom("RA-2", `knowledge.entry:terms#sha256:${SHA}`),
            atom("RA-3", `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}`),
          ],
        },
        automation: {
          status: "not-started",
          intents: [],
          last_handoff_path: null,
          last_run_status: "not-run",
        },
        files: {
          archive: "archive.md",
          xmind: "cases.xmind",
          tests_root: null,
          latest_results: null,
        },
      },
      "# Cases\n## Login [RA-1]\n- step: click / expected: ok\n",
    );
    const r = await runCasesVerify({
      project: "dataAssets",
      featureId: "2026-05-ok",
      workspaceRoot: ws,
      requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"],
    });
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("fails L1 when a completed feature is missing a stable-core artifact", async () => {
    const atom = (id: string, ref: string) => ({
      id,
      source_ref: ref,
      ambiguity_class: "confirmed",
      confidence: "high",
    });
    const dir = seed(
      "2026-05-nocore",
      {
        schema: "FeatureManifest@2",
        feature_id: "2026-05-nocore",
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          xmind_path: "cases.xmind",
          coverage_matrix_path: "coverage-matrix.json",
          requirement_atoms: [
            atom("RA-1", `lanhu.fixture:f#sha256:${SHA}`),
            atom("RA-2", `knowledge.entry:terms#sha256:${SHA}`),
            atom("RA-3", `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}`),
          ],
        },
        automation: {
          status: "not-started",
          intents: [],
          last_handoff_path: null,
          last_run_status: "not-run",
        },
        files: {
          archive: "archive.md",
          xmind: "cases.xmind",
          tests_root: null,
          latest_results: null,
        },
      },
      "# Cases\n## Login [RA-1]\n- step: click / expected: ok\n",
    );
    rmSync(join(dir, "cases.xmind"));
    const r = await runCasesVerify({
      project: "dataAssets",
      featureId: "2026-05-nocore",
      workspaceRoot: ws,
      requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"],
    });
    expect(r.ok).toBe(false);
    expect(
      r.issues.some((i) => i.rule === "stable_core_missing" && i.message.includes("cases.xmind")),
    ).toBe(true);
  });

  it("fails L3 with a coverage_hole when an atom is uncovered by coverage-matrix.json", async () => {
    const atom = (id: string, ref: string) => ({
      id,
      source_ref: ref,
      ambiguity_class: "confirmed",
      confidence: "high",
    });
    seed(
      "2026-05-hole",
      {
        schema: "FeatureManifest@2",
        feature_id: "2026-05-hole",
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          xmind_path: "cases.xmind",
          coverage_matrix_path: "coverage-matrix.json",
          requirement_atoms: [
            atom("RA-1", `lanhu.fixture:f#sha256:${SHA}`),
            atom("RA-2", `knowledge.entry:terms#sha256:${SHA}`),
            atom("RA-9", `repo.line:dt-insight-studio/src/x.ts:1#sha256:${SHA}`),
          ],
        },
        automation: {
          status: "not-started",
          intents: [],
          last_handoff_path: null,
          last_run_status: "not-run",
        },
        files: {
          archive: "archive.md",
          xmind: "cases.xmind",
          tests_root: null,
          latest_results: null,
        },
      },
      "# Cases\n## Login [RA-1]\n- step: click / expected: ok\n",
    );
    const r = await runCasesVerify({
      project: "dataAssets",
      featureId: "2026-05-hole",
      workspaceRoot: ws,
      requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"],
    });
    expect(r.ok).toBe(false);
    expect(
      r.issues.some(
        (i) => i.layer === "L3" && i.rule === "coverage_hole" && i.message.includes("RA-9"),
      ),
    ).toBe(true);
  });
});
