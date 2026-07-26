import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const KATA = resolve(import.meta.dir, "../../cli/bin/kata.ts");

function proj(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-kcli-"));
  mkdirSync(join(root, "workspace", "dataAssets", "knowledge"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

function kata(root: string, args: string[]) {
  return spawnSync("bun", [KATA, ...args], { encoding: "utf8", cwd: root });
}

function writeModule(root: string) {
  return kata(root, [
    "knowledge",
    "write",
    "--project",
    "dataAssets",
    "--type",
    "module",
    "--status",
    "verified",
    "--title",
    "数据质量规则",
    "--body",
    "字段级/表级两类",
    "--source",
    "tests/knowledge-cli.test.ts",
    "--tags",
    "质量,规则",
  ]);
}

describe("kata knowledge write", () => {
  it("writes a module entry with status frontmatter", () => {
    const root = proj();
    const r = writeModule(root);
    expect(r.status).toBe(0);
    const file = join(root, "workspace", "dataAssets", "knowledge", "modules", "数据质量规则.md");
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, "utf8");
    expect(content).toContain("status: verified");
    expect(content).toContain("字段级/表级两类");
  });

  it("observed with a source writes without promotion", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "pitfall",
      "--status",
      "observed",
      "--title",
      "单次观察坑",
      "--body",
      "只见过一次",
      "--source",
      "tests/knowledge-cli.test.ts",
    ]);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).status).toBe("observed");
    expect(
      existsSync(join(root, "workspace", "dataAssets", "knowledge", "pitfalls", "单次观察坑.md")),
    ).toBe(true);
  });

  it("observed with --confirmed writes the entry", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "pitfall",
      "--status",
      "observed",
      "--title",
      "单次观察坑",
      "--body",
      "只见过一次",
      "--source",
      "tests/knowledge-cli.test.ts",
    ]);
    expect(r.status).toBe(0);
    const dir = join(root, "workspace", "dataAssets", "knowledge", "pitfalls");
    expect(existsSync(dir)).toBe(true);
  });

  it("rejects invalid status", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "module",
      "--status",
      "maybe",
      "--title",
      "x",
      "--body",
      "y",
      "--source",
      "tests/knowledge-cli.test.ts",
    ]);
    expect(r.status).not.toBe(0);
  });
});

describe("kata knowledge read", () => {
  it("finds entries by keyword with --json", () => {
    const root = proj();
    writeModule(root);
    const r = kata(root, [
      "knowledge",
      "read",
      "--project",
      "dataAssets",
      "--keyword",
      "数据质量",
      "--json",
    ]);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].title).toBe("数据质量规则");
    expect(out.entries[0].status).toBe("verified");
  });

  it("filters by module via title or tags", () => {
    const root = proj();
    writeModule(root);
    kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "pitfall",
      "--status",
      "verified",
      "--title",
      "无关坑",
      "--body",
      "别的模块",
      "--tags",
      "其他",
    ]);
    const r = kata(root, [
      "knowledge",
      "read",
      "--project",
      "dataAssets",
      "--module",
      "质量",
      "--json",
    ]);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].title).toBe("数据质量规则");
  });

  it("prints human-readable output without --json", () => {
    const root = proj();
    writeModule(root);
    const r = kata(root, ["knowledge", "read", "--project", "dataAssets", "--keyword", "规则"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("数据质量规则");
    expect(r.stdout).toContain("verified");
  });
});

describe("kata knowledge index", () => {
  it("rebuilds _index.md containing written entries", () => {
    const root = proj();
    writeModule(root);
    const r = kata(root, ["knowledge", "index", "--project", "dataAssets"]);
    expect(r.status).toBe(0);
    const index = readFileSync(
      join(root, "workspace", "dataAssets", "knowledge", "_index.md"),
      "utf8",
    );
    expect(index).toContain("数据质量规则");
    expect(index).toContain("modules/数据质量规则.md");
  });
});
