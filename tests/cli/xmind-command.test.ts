import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MD = `---
suite_name: 归档需求
---
## 模块A
##### 【P1】用例一
> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | a | e |
`;

function run(args: string[]) {
  return spawnSync("bun", ["cli/bin/kata.ts", "xmind", "generate", ...args], {
    encoding: "utf8",
  });
}

describe("kata xmind generate", () => {
  // 输入必须在仓库根内,临时目录建在仓库根下
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(process.cwd(), ".tmp-xm-"));
    writeFileSync(join(dir, "archive.md"), MD);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects an --output outside the repo root", () => {
    const r = run(["--input", join(dir, "archive.md"), "--output", join(tmpdir(), "escape.xmind")]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("越出仓库根");
  });

  it("writes the derived xmind without creating a tmp/ dir", () => {
    const r = run(["--input", join(dir, "archive.md")]);
    expect(r.status).toBe(0);
    expect(existsSync(join(dir, "archive.xmind"))).toBe(true);
    expect(existsSync(join(dir, "tmp"))).toBe(false);
  });

  it("creates tmp/ only for --json-only", () => {
    const r = run(["--input", join(dir, "archive.md"), "--json-only"]);
    expect(r.status).toBe(0);
    const json = JSON.parse(readFileSync(join(dir, "tmp", "archive.json"), "utf8"));
    expect(json.meta.requirement_name).toBe("归档需求");
  });
});
