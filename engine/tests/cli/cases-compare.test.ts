import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesCompare } from "../../src/cli/cases-compare.ts";

const SHA = "a".repeat(64);
function writeManifest(dir: string, featureId: string, refs: string[]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify(
      {
        schema: "FeatureManifest@2",
        feature_id: featureId,
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          xmind_path: null,
          coverage_matrix_path: "coverage-matrix.json",
          requirement_atoms: refs.map((r, i) => ({ id: `RA-${i}`, source_ref: r })),
        },
        automation: {
          status: "not-started",
          intents: [],
          last_handoff_path: null,
          last_run_status: "not-run",
        },
        files: { archive: "archive.md", xmind: null, tests_root: null, latest_results: null },
      },
      null,
      2,
    ),
  );
}

describe("runCasesCompare", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "kata-compare-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("FAILs on path mismatch", () => {
    writeManifest(join(root, "claude/features/2026-05-a"), "2026-05-a", [
      `lanhu.fixture:f#sha256:${SHA}`,
    ]);
    writeManifest(join(root, "codex/features/2026-05-b"), "2026-05-b", [
      `lanhu.fixture:f#sha256:${SHA}`,
    ]);
    const r = runCasesCompare({
      leftDir: join(root, "claude/features/2026-05-a"),
      rightDir: join(root, "codex/features/2026-05-b"),
      threshold: 0.9,
    });
    expect(r.fail).toBe(true);
    expect(r.findings.some((f) => f.rule === "path_mismatch" && f.severity === "FAIL")).toBe(true);
  });

  it("WARNs (not FAIL) when non-critical coverage dips below threshold", () => {
    const dir = "2026-05-x";
    writeManifest(join(root, `claude/features/${dir}`), dir, [
      `lanhu.fixture:a#sha256:${SHA}`,
      `knowledge.entry:b#sha256:${SHA}`,
    ]);
    writeManifest(join(root, `codex/features/${dir}`), dir, [`lanhu.fixture:a#sha256:${SHA}`]);
    const r = runCasesCompare({
      leftDir: join(root, `claude/features/${dir}`),
      rightDir: join(root, `codex/features/${dir}`),
      threshold: 0.9,
    });
    expect(r.fail).toBe(false);
    expect(
      r.findings.some((f) => f.rule === "coverage_below_threshold" && f.severity === "WARN"),
    ).toBe(true);
  });

  it("FAILs when the stable-core file set differs", () => {
    const dir = "2026-05-fs";
    writeManifest(join(root, `claude/features/${dir}`), dir, [`lanhu.fixture:a#sha256:${SHA}`]);
    writeManifest(join(root, `codex/features/${dir}`), dir, [`lanhu.fixture:a#sha256:${SHA}`]);
    writeFileSync(join(root, `claude/features/${dir}`, "cases.xmind"), "PK");
    const r = runCasesCompare({
      leftDir: join(root, `claude/features/${dir}`),
      rightDir: join(root, `codex/features/${dir}`),
      threshold: 0.9,
    });
    expect(r.fail).toBe(true);
    expect(r.findings.some((f) => f.rule === "file_set_mismatch" && f.severity === "FAIL")).toBe(
      true,
    );
  });

  it("FAILs when a critical (high-confidence) fact is missing on one side", () => {
    const dir = "2026-05-crit";
    function writeRich(d: string, atoms: object[]) {
      mkdirSync(d, { recursive: true });
      writeFileSync(
        join(d, "manifest.json"),
        JSON.stringify(
          {
            schema: "FeatureManifest@2",
            feature_id: dir,
            case_drafting: {
              status: "completed",
              archive_path: "archive.md",
              xmind_path: "cases.xmind",
              coverage_matrix_path: "coverage-matrix.json",
              requirement_atoms: atoms,
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
          null,
          2,
        ),
      );
    }
    writeRich(join(root, `claude/features/${dir}`), [
      {
        id: "RA-1",
        source_ref: `lanhu.fixture:crit#sha256:${SHA}`,
        ambiguity_class: "blocking_unknown",
        confidence: "high",
      },
    ]);
    writeRich(join(root, `codex/features/${dir}`), [
      {
        id: "RA-1",
        source_ref: `lanhu.fixture:other#sha256:${SHA}`,
        ambiguity_class: "confirmed",
        confidence: "low",
      },
    ]);
    const r = runCasesCompare({
      leftDir: join(root, `claude/features/${dir}`),
      rightDir: join(root, `codex/features/${dir}`),
      threshold: 0.0,
    });
    expect(r.fail).toBe(true);
    expect(
      r.findings.some((f) => f.rule === "critical_fact_missing" && f.severity === "FAIL"),
    ).toBe(true);
  });

  it("passes clean when sets match and paths agree", () => {
    const dir = "2026-05-x";
    const refs = [`lanhu.fixture:a#sha256:${SHA}`, `knowledge.entry:b#sha256:${SHA}`];
    writeManifest(join(root, `claude/features/${dir}`), dir, refs);
    writeManifest(join(root, `codex/features/${dir}`), dir, refs);
    const r = runCasesCompare({
      leftDir: join(root, `claude/features/${dir}`),
      rightDir: join(root, `codex/features/${dir}`),
      threshold: 0.9,
    });
    expect(r.fail).toBe(false);
    expect(r.findings).toEqual([]);
  });
});
