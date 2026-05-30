import { describe, expect, it } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesCompare } from "@shared/cli/cases-compare.ts";
import { runCaseDraftE2e } from "@shared/lib/e2e/case-draft-e2e.ts";
import { repoRoot } from "@shared/lib/paths.ts";

function writeFakeRuntime(binPath: string): void {
  writeFileSync(
    binPath,
    `#!/bin/sh
set -eu
feature="$PWD/workspace/dataAssets/features/2026-05-lanhu-cd882ee8"
mkdir -p "$feature" "$feature/inputs" "$PWD/workspace/dataAssets/_shared/knowledge" "$PWD/workspace/dataAssets/.kata/repos/dt-insight-studio/src"
printf '# terms\\n' > "$PWD/workspace/dataAssets/_shared/knowledge/terms.md"
printf 'x\\n' > "$PWD/workspace/dataAssets/.kata/repos/dt-insight-studio/src/x.ts"
printf 'PK' > "$feature/cases.xmind"
cat > "$feature/archive.md" <<'MD'
# Cases
## Login [RA-1]
- step: click / expected: ok
MD
cat > "$feature/metadata.yaml" <<'YAML'
schema: FeatureMetadata@1
id: 2026-05-lanhu-cd882ee8
display_name: seed
status: active
created_at: '2026-05-23'
updated_at: '2026-05-23'
modules: [dq]
customers: []
versions: []
owners: [qa]
inputs: [{kind: lanhu, ref: 'https://lanhuapp.com/x'}]
relates_to: []
emits: {}
YAML
mkdir -p "$feature/.process"
cat > "$feature/.process/source-snapshot.json" <<'JSON'
{
  "schema": "FeatureSourceSnapshot@1",
  "feature_id": "2026-05-lanhu-cd882ee8",
  "lanhu": { "url": "https://lanhuapp.com/x", "page_id": "p1" },
  "confirmed_source_repos": [{ "group": "customltem", "project": "dt-insight-studio", "branch": "main", "role": "frontend" }],
  "knowledge_refs": ["terms"],
  "slug_source": "lanhu:cd882ee8"
}
JSON
cat > "$feature/.process/coverage-matrix.json" <<'JSON'
[
  {
    "schema_ref": "CoverageMatrix@1",
    "id": "CM-1",
    "title": "cov",
    "coverage_type": "functional",
    "requirement_atom_ids": ["RA-1", "RA-2", "RA-3"],
    "risk_level": "high",
    "evidence_status": "covered",
    "manual_case_allowed": true,
    "automation_allowed": true
  }
]
JSON
cat > "$feature/manifest.json" <<'JSON'
{
  "schema": "FeatureManifest@2",
  "feature_id": "2026-05-lanhu-cd882ee8",
  "case_drafting": {
    "status": "completed",
    "archive_path": "archive.md",
    "xmind_path": "cases.xmind",
    "coverage_matrix_path": ".process/coverage-matrix.json",
    "requirement_atoms": [
      { "id": "RA-1", "source_ref": "lanhu.fixture:f#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "ambiguity_class": "confirmed", "confidence": "high" },
      { "id": "RA-2", "source_ref": "knowledge.entry:terms#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "ambiguity_class": "confirmed", "confidence": "high" },
      { "id": "RA-3", "source_ref": "repo.line:dt-insight-studio/src/x.ts:1#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "ambiguity_class": "confirmed", "confidence": "high" }
    ]
  },
  "automation": { "status": "not-started", "intents": [], "last_handoff_path": null, "last_run_status": "not-run" },
  "files": { "archive": "archive.md", "xmind": "cases.xmind", "tests_root": null, "latest_results": null }
}
JSON
`,
  );
  chmodSync(binPath, 0o755);
}

describe("case-draft e2e (fixture replay)", () => {
  const base = join(repoRoot(), ".claude/scripts/_shared/tests/fixtures/case-draft-e2e/expected");
  it("frozen claude vs codex manifests pass compare (no FAIL)", () => {
    const r = runCasesCompare({
      leftDir: join(base, "claude", "2026-05-lanhu-cd882ee8"),
      rightDir: join(base, "codex", "2026-05-lanhu-cd882ee8"),
      threshold: 0.9,
    });
    expect(r.fail).toBe(false);
  });

  it("orchestrates verify and compare against runtimeRoot/workspace outputs", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-e2e-orchestrator-"));
    const bin = join(root, "bin");
    mkdirSync(bin, { recursive: true });
    writeFakeRuntime(join(bin, "claude"));
    writeFakeRuntime(join(bin, "codex"));
    const oldPath = process.env.PATH;
    process.env.PATH = `${bin}:${oldPath ?? ""}`;
    try {
      const r = await runCaseDraftE2e({
        project: "dataAssets",
        featureId: "2026-05-lanhu-cd882ee8",
        snapshotPath: join(root, "source-snapshot.json"),
        outRoot: join(root, "out"),
        workspaceRoot: join(root, "out", "claude"),
        threshold: 0.9,
        requiredKinds: ["lanhu.fixture", "knowledge.entry", "repo.line"],
      });
      expect(r.ok).toBe(true);
      expect(r.compare.findings).toEqual([]);
    } finally {
      process.env.PATH = oldPath;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
