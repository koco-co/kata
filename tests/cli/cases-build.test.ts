import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computePrdDigest } from "../../cli/lib/prd.ts";

const YAML = `
meta: { title: 需求名, case_module_id: "" }
cases:
  - { case_id: C0001, title: 用例一, priority: P0, steps: [ { action: a, expected: e } ] }
`;

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-cb-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0", "【模块】需求名");
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
      'meta: { title: t, case_module_id: "" }\ncases: []\n',
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
  });
  it("blocks stale cases when test-points no longer matches the PRD digest chain", () => {
    const d = feature();
    mkdirSync(join(d, "prd"), { recursive: true });
    const prd = `---
source: lanhu
source_url: "https://lanhuapp.com/"
requirement_id: "1"
evidence_digest: "sha256:evidence"
---
# 需求
`;
    writeFileSync(join(d, "prd", "prd.md"), prd);
    const actualPrdDigest = computePrdDigest(prd);
    writeFileSync(
      join(d, "cases", "test-points.md"),
      `---
prd_digest: "${actualPrdDigest}"
---
# 测试点

| ID | 测试点 | 类型 | 优先级 | PRD 依据 |
| --- | --- | --- | --- | --- |
| TP-001 | 验证需求 | 正常 | P0 | FR-001, AC-001 |
`,
    );
    writeFileSync(
      join(d, "cases", "需求名.yaml"),
      `meta:
  title: 需求名
  case_module_id: ""
  test_points_digest: "sha256:stale"
cases:
  - case_id: C0001
    title: 用例一
    priority: P0
    steps: [{ action: a, expected: e }]
`,
    );
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("test_points_digest");
  });
});
