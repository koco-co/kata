import { afterAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { snapshotFileRef } from "@shared/lib/source-ref/resolvers.ts";

const REPO_ROOT = resolvePath(import.meta.dirname, "../../../..");
const CLI_ARGS = [join(REPO_ROOT, ".claude/scripts/_shared/cli/index.ts"), "source-ref"];

describe("kata source-ref canonical protocol", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-source-ref-cli-"));
  const project = "test-project";
  const featureDir = join(tmp, project, "features", "2026-07-demo-feature");
  const content = "# PRD\n";
  const ref = snapshotFileRef({ id: "prd.file:prd.md", content });
  mkdirSync(join(featureDir, "inputs"), { recursive: true });
  writeFileSync(join(featureDir, "inputs", "prd.md"), content);

  const baseArgs = ["--project", project, "--workspace-dir", tmp, "--feature-dir", featureDir];

  it("resolves a canonical hash-backed ref", () => {
    const result = spawnSync("bun", [...CLI_ARGS, "resolve", "--ref", ref, ...baseArgs], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"ok": true');
  });

  it("rejects the removed scheme#anchor protocol", () => {
    const result = spawnSync(
      "bun",
      [...CLI_ARGS, "resolve", "--ref", "prd#section-1", ...baseArgs],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("格式非法");
  });

  it("batch returns exit 2 when one ref is stale", () => {
    const refsJson = join(tmp, "refs.json");
    const stale = snapshotFileRef({ id: "prd.file:prd.md", content: "stale" });
    writeFileSync(refsJson, JSON.stringify([{ ref }, { ref: stale }]));
    const result = spawnSync("bun", [...CLI_ARGS, "batch", "--refs-json", refsJson, ...baseArgs], {
      encoding: "utf8",
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('"total": 2');
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
