import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YAML = `
meta: { title: 需求名, version: v1.0, feature_id: v1.0/f1, case_module_id: "" }
cases:
  - { case_id: C0001, title: 用例一, priority: P0, steps: [ { action: a, expected: e } ] }
`;

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-cb-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0", "f1");
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求名.yaml"), YAML);
  return featureDir;
}

describe("kata cases build", () => {
  it("defaults to xmind only when meta.exports is absent", async () => {
    const d = feature();
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const xmindPath = join(d, "cases", "exports", "需求名.xmind");
    expect(existsSync(xmindPath)).toBe(true);
    // xmind 是 zip:必须可解压且含 content.json
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(readFileSync(xmindPath));
    expect(zip.file("content.json")).not.toBeNull();
    expect(existsSync(join(d, "cases", "exports", "需求名.md"))).toBe(false);
  });
  it("fails on zero cases", () => {
    const d = feature();
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      'meta: { title: t, version: v1.0, feature_id: v1.0/f, case_module_id: "" }\ncases: []\n',
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
  });
});
