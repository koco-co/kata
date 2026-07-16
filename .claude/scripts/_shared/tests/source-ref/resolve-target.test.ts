import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSourceRefTarget, sourceRefKind } from "@shared/lib/source-ref/resolve-target.ts";

describe("sourceRefKind", () => {
  it("extracts the scheme", () => {
    expect(sourceRefKind("knowledge.entry:terms#sha256:" + "a".repeat(64))).toBe("knowledge.entry");
    expect(sourceRefKind("repo.line:dt-insight-studio/src/x.ts:42#sha256:" + "a".repeat(64))).toBe(
      "repo.line",
    );
  });
});

describe("resolveSourceRefTarget", () => {
  let ws: string;
  let sourceRoot: string;
  let sourceRepo: string;
  const sourceUrl = "https://gitlab.example.test/customltem/dt-insight-studio.git";

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "kata-resolve-target-"));
    ws = join(tmp, "workspace");
    sourceRoot = join(tmp, "sources");
    sourceRepo = join(sourceRoot, "checked-out", "dt-insight-studio");
    mkdirSync(join(ws, "dataAssets/_shared/knowledge"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/_shared/knowledge/terms.md"), "# terms\n");
    mkdirSync(join(sourceRepo, "src"), { recursive: true });
    execFileSync("git", ["-C", sourceRepo, "init"]);
    execFileSync("git", ["-C", sourceRepo, "config", "user.email", "test@local"]);
    execFileSync("git", ["-C", sourceRepo, "config", "user.name", "test"]);
    execFileSync("git", ["-C", sourceRepo, "remote", "add", "origin", sourceUrl]);
    writeFileSync(join(sourceRepo, "src/x.ts"), "export const direct = 1;\n");
    execFileSync("git", ["-C", sourceRepo, "add", "src/x.ts"]);
    execFileSync("git", ["-C", sourceRepo, "commit", "-m", "seed"]);
    execFileSync("git", ["-C", sourceRepo, "branch", "dataAssets/release_6.3.x_ltqc"]);
  });

  afterEach(() => rmSync(join(ws, ".."), { recursive: true, force: true }));

  const repoCtx = () => ({
    workspaceRoot: ws,
    project: "dataAssets",
    sourceRepoRoot: sourceRoot,
    sourceRepoUrls: sourceUrl,
  });

  it("resolves a knowledge.entry to a file under _shared/knowledge", () => {
    const t = resolveSourceRefTarget("knowledge.entry:terms#sha256:" + "a".repeat(64), repoCtx());
    expect(t.found).toBe(true);
    expect(t.content).toContain("# terms");
  });

  it("resolves a repo.line through the configured external repository", () => {
    const t = resolveSourceRefTarget(
      "repo.line:dt-insight-studio/src/x.ts:1#sha256:" + "a".repeat(64),
      repoCtx(),
    );
    expect(t.found).toBe(true);
    expect(t.content).toContain("export const direct");
    expect(t.path).toContain(sourceRepo);
  });

  it("resolves a confirmed group/project/branch triple via git show", () => {
    const t = resolveSourceRefTarget(
      "repo.line:customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc:src/x.ts:1#sha256:" +
        "a".repeat(64),
      {
        ...repoCtx(),
        confirmedRepos: [
          {
            group: "customltem",
            project: "dt-insight-studio",
            branch: "dataAssets/release_6.3.x_ltqc",
          },
        ],
      },
    );
    expect(t.found).toBe(true);
    expect(t.content).toContain("export const direct");
    expect(t.path).toContain("@dataAssets/release_6.3.x_ltqc:src/x.ts");
  });

  it("rejects a branch outside the confirmed triples", () => {
    const t = resolveSourceRefTarget(
      "repo.line:customltem/dt-insight-studio@main:src/x.ts:1#sha256:" + "a".repeat(64),
      {
        ...repoCtx(),
        confirmedRepos: [
          {
            group: "customltem",
            project: "dt-insight-studio",
            branch: "dataAssets/release_6.3.x_ltqc",
          },
        ],
      },
    );
    expect(t.found).toBe(false);
  });

  it("reports not found for a missing knowledge entry", () => {
    const t = resolveSourceRefTarget("knowledge.entry:missing#sha256:" + "a".repeat(64), repoCtx());
    expect(t.found).toBe(false);
  });
});
