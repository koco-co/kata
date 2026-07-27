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

  it("rejects entry types carrying overview-only flags", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "module",
      "--status",
      "observed",
      "--title",
      "x",
      "--body",
      "y",
      "--source",
      "tests/knowledge-cli.test.ts",
      "--content",
      "{}",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("仅 overview 类型可用");
  });

  it("requires --source for entry writes", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "module",
      "--status",
      "observed",
      "--title",
      "x",
      "--body",
      "y",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("--source");
  });

  it("rejects illegal title characters", () => {
    const root = proj();
    const r = kata(root, [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "module",
      "--status",
      "observed",
      "--title",
      "坏\n标题",
      "--body",
      "y",
      "--source",
      "tests/knowledge-cli.test.ts",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("非法 title");
  });

  it("does not re-append body already contained in the existing entry", () => {
    const root = proj();
    const base = [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "module",
      "--status",
      "observed",
      "--title",
      "去重条目",
      "--source",
      "tests/knowledge-cli.test.ts",
    ];
    expect(kata(root, [...base, "--body", "第一段\n\n第二段"]).status).toBe(0);
    const r = kata(root, [...base, "--body", "第一段"]);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).action).toBe("merge");
    const file = join(root, "workspace", "dataAssets", "knowledge", "modules", "去重条目.md");
    const content = readFileSync(file, "utf8");
    expect(content.match(/第一段/g)).toHaveLength(1);
    expect(content).toContain("第二段");
  });

  it("keeps observed→verified promotion pending until --confirmed", () => {
    const root = proj();
    const base = [
      "knowledge",
      "write",
      "--project",
      "dataAssets",
      "--type",
      "pitfall",
      "--title",
      "升级条目",
      "--body",
      "同一正文",
      "--source",
      "tests/knowledge-cli.test.ts",
    ];
    expect(kata(root, [...base, "--status", "observed"]).status).toBe(0);

    const pending = kata(root, [...base, "--status", "verified"]);
    expect(pending.status).toBe(0);
    const pendingOut = JSON.parse(pending.stdout);
    expect(pendingOut.pending).toBe(true);
    expect(pendingOut.promotion).toBe(true);
    const file = join(root, "workspace", "dataAssets", "knowledge", "pitfalls", "升级条目.md");
    expect(readFileSync(file, "utf8")).toContain("status: observed");

    const confirmed = kata(root, [...base, "--status", "verified", "--confirmed"]);
    expect(confirmed.status).toBe(0);
    expect(JSON.parse(confirmed.stdout).status).toBe("verified");
    expect(readFileSync(file, "utf8")).toContain("status: verified");
  });
});

describe("kata knowledge read", () => {
  it("rejects an unknown --type instead of silently ignoring it", () => {
    const root = proj();
    const r = kata(root, ["knowledge", "read", "--project", "dataAssets", "--type", "bogus"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("非法 --type");
  });

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

  it("injects observed (not verified) frontmatter into bare files and keeps verified files intact", () => {
    const root = proj();
    const modulesDir = join(root, "workspace", "dataAssets", "knowledge", "modules");
    mkdirSync(modulesDir, { recursive: true });
    writeFileSync(join(modulesDir, "bare.md"), "# 裸文件\n\n无 frontmatter。\n");
    const verified = [
      "---",
      "title: 已确认条目",
      "type: module",
      "tags: []",
      "status: verified",
      'source: "tests"',
      "updated: 2026-07-01",
      "---",
      "",
      "已确认正文",
      "",
    ].join("\n");
    writeFileSync(join(modulesDir, "verified.md"), verified);

    const r = kata(root, ["knowledge", "index", "--project", "dataAssets"]);
    expect(r.status).toBe(0);
    const fixed = readFileSync(join(modulesDir, "bare.md"), "utf8");
    expect(fixed).toContain("status: observed");
    expect(fixed).not.toContain("verified");
    expect(readFileSync(join(modulesDir, "verified.md"), "utf8")).toBe(verified);
  });
});
