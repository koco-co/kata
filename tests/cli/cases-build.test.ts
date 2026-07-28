import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YAML = `
meta: { title: 需求名, version: v1, feature_id: f1 }
cases:
  - { case_id: C0001, title: 用例一, priority: P0, steps: [ { action: a, expected: e } ] }
`;

function feature(): string {
  const d = mkdtempSync(join(tmpdir(), "kata-cb-"));
  mkdirSync(join(d, "cases"), { recursive: true });
  writeFileSync(join(d, "cases", "需求名.yaml"), YAML);
  return d;
}

describe("kata cases build", () => {
  it("produces xmind and exports/md from yaml", async () => {
    const d = feature();
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const xmindPath = join(d, "cases", "需求名.xmind");
    expect(existsSync(xmindPath)).toBe(true);
    // xmind 是 zip:必须可解压且含 content.json
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(readFileSync(xmindPath));
    expect(zip.file("content.json")).not.toBeNull();
    const md = readFileSync(join(d, "cases", "exports", "需求名.md"), "utf8");
    expect(md).toContain("由 build 生成");
    expect(md).toContain("用例一");
  });
  it("fails on zero cases", () => {
    const d = feature();
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      "meta: { title: t, version: v, feature_id: f }\ncases: []\n",
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
  });
});
