import { afterEach, beforeEach, describe, expect, it } from "bun:test";
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
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-resolve-target-")), "workspace");
    mkdirSync(join(ws, "dataAssets/_shared/knowledge"), { recursive: true });
    writeFileSync(join(ws, "dataAssets/_shared/knowledge/terms.md"), "# terms\n");
    mkdirSync(join(ws, "dataAssets/.kata/repos/dt-insight-studio/src"), { recursive: true });
    writeFileSync(
      join(ws, "dataAssets/.kata/repos/dt-insight-studio/src/x.ts"),
      "export const a = 1;\n",
    );
    mkdirSync(join(ws, "dataAssets/.kata/repos/customltem/dt-insight-studio/src"), {
      recursive: true,
    });
    writeFileSync(
      join(ws, "dataAssets/.kata/repos/customltem/dt-insight-studio/src/x.ts"),
      "export const scoped = 1;\n",
    );
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("resolves a knowledge.entry to a file under _shared/knowledge", () => {
    const t = resolveSourceRefTarget("knowledge.entry:terms#sha256:" + "a".repeat(64), {
      workspaceRoot: ws,
      project: "dataAssets",
    });
    expect(t.found).toBe(true);
    expect(t.content).toContain("# terms");
  });

  it("resolves a repo.line to a file under .kata/repos", () => {
    const t = resolveSourceRefTarget(
      "repo.line:dt-insight-studio/src/x.ts:1#sha256:" + "a".repeat(64),
      { workspaceRoot: ws, project: "dataAssets" },
    );
    expect(t.found).toBe(true);
    expect(t.content).toContain("export const a");
  });

  it("resolves a repo.line against a confirmed group/project/branch triple", () => {
    const t = resolveSourceRefTarget(
      "repo.line:customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc:src/x.ts:1#sha256:" +
        "a".repeat(64),
      {
        workspaceRoot: ws,
        project: "dataAssets",
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
    expect(t.content).toContain("export const scoped");
  });

  it("rejects a repo.line whose branch is not one of the confirmed triples", () => {
    const t = resolveSourceRefTarget(
      "repo.line:customltem/dt-insight-studio@main:src/x.ts:1#sha256:" + "a".repeat(64),
      {
        workspaceRoot: ws,
        project: "dataAssets",
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
    const t = resolveSourceRefTarget("knowledge.entry:missing#sha256:" + "a".repeat(64), {
      workspaceRoot: ws,
      project: "dataAssets",
    });
    expect(t.found).toBe(false);
  });
});
