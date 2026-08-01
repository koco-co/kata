import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readEntries, writeEntry } from "../../cli/lib/knowledge/store.ts";
import type { KnowledgeEntry } from "../../cli/lib/knowledge/types.ts";
import { locateProject } from "../../cli/lib/workspace-locator.ts";

function proj() {
  const root = mkdtempSync(join(tmpdir(), "kata-kn-"));
  mkdirSync(join(root, "workspace", "dataAssets", "knowledge"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return locateProject("dataAssets", root);
}

function entry(partial: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    title: "默认标题",
    type: "pitfall",
    status: "verified",
    tags: [],
    updated: "2026-07-25",
    body: "正文",
    source: "tests/knowledge-store.test.ts",
    ...partial,
  };
}

describe("knowledge store", () => {
  it("does not read the retired _shared/knowledge fallback", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-kn-legacy-"));
    const projectDir = join(root, "workspace", "dataAssets");
    mkdirSync(join(projectDir, "_shared", "knowledge", "pitfalls"), { recursive: true });
    writeFileSync(join(root, "package.json"), "{}\n");
    writeFileSync(
      join(projectDir, "_shared", "knowledge", "pitfalls", "retired.md"),
      [
        "---",
        "title: 旧知识",
        "type: pitfall",
        "tags: []",
        "status: verified",
        'source: ""',
        "updated: 2026-07-25",
        "---",
        "",
        "旧内容",
      ].join("\n"),
    );
    const p = locateProject("dataAssets", root);
    expect(readEntries(p, { keyword: "旧知识" })).toHaveLength(0);
  });

  it("writes and reads back an entry with status", () => {
    const p = proj();
    writeEntry(p, entry({ title: "Hive2 大小写敏感", tags: ["hive"], body: "Hive2.x ≠ hive2.x" }));
    const hits = readEntries(p, { keyword: "大小写" });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.status).toBe("verified");
    expect(hits[0]?.body).toContain("Hive2.x ≠ hive2.x");
  });

  it("filters by type", () => {
    const p = proj();
    writeEntry(
      p,
      entry({ title: "规则类型枚举", type: "module", status: "observed", tags: ["数据质量"] }),
    );
    expect(readEntries(p, { types: ["pitfall"] })).toHaveLength(0);
    expect(readEntries(p, { types: ["module"] })).toHaveLength(1);
  });

  it("filters by module (title or tags match)", () => {
    const p = proj();
    writeEntry(p, entry({ title: "数据质量规则语义", type: "module", tags: ["数据质量"] }));
    writeEntry(p, entry({ title: "元数据同步坑", tags: ["元数据"] }));
    expect(readEntries(p, { module: "数据质量" })).toHaveLength(1);
  });

  it("overwrites the same-titled entry instead of duplicating", () => {
    const p = proj();
    writeEntry(p, entry({ title: "同一条目", body: "旧" }));
    writeEntry(p, entry({ title: "同一条目", body: "新", status: "observed" }));
    const hits = readEntries(p, { keyword: "同一条目" });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.body).toContain("新");
    expect(hits[0]?.status).toBe("observed");
  });

  it("does not treat legacy confidence frontmatter as a readable entry", () => {
    const p = proj();
    const dir = join(p.knowledgeDir, "pitfalls");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "2026-04-27-legacy.md"),
      [
        "---",
        "title: 旧条目",
        "type: pitfall",
        "tags: []",
        "confidence: high",
        'source: ""',
        "updated: 2026-04-27",
        "---",
        "",
        "旧正文",
      ].join("\n"),
    );
    expect(readEntries(p, { keyword: "旧条目" })).toHaveLength(0);
  });

  it("reads site entries nested one level down (sites/<host>/dom-*.md)", () => {
    const p = proj();
    const dir = join(p.knowledgeDir, "sites", "192.0.2.52");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "dom-dataAssets.md"),
      [
        "---",
        "title: 192.0.2.52 DataAssets DOM",
        "type: site",
        "tags: [数据质量]",
        "status: verified",
        'source: ""',
        "updated: 2026-07-25",
        "---",
        "",
        "菜单【数据质量】-【规则配置】",
      ].join("\n"),
    );
    expect(readEntries(p, { types: ["site"] })).toHaveLength(1);
    expect(readEntries(p, { module: "数据质量" })).toHaveLength(1);
    expect(readEntries(p, { keyword: "规则配置" })).toHaveLength(1);
  });

  it("stores terms as one file per entry and filters deprecated by default only at the CLI layer", () => {
    const p = proj();
    writeEntry(p, entry({ type: "term", title: "数据血缘", body: "上下游关系" }));
    expect(readEntries(p, { types: ["term"] })[0]?.title).toBe("数据血缘");
  });

  it("rejects writes through a symlinked knowledge subdirectory", () => {
    const p = proj();
    const outside = mkdtempSync(join(tmpdir(), "kata-kn-outside-"));
    const target = join(p.knowledgeDir, "pitfalls");
    symlinkSync(outside, target);
    try {
      expect(() => writeEntry(p, entry({ title: "不要越界写入" }))).toThrow(/符号链接/);
    } finally {
      rmSync(target, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects reads through a symlinked knowledge subdirectory", () => {
    const p = proj();
    const outside = mkdtempSync(join(tmpdir(), "kata-kn-read-outside-"));
    const target = join(p.knowledgeDir, "pitfalls");
    writeFileSync(
      join(outside, "outside.md"),
      "---\ntitle: 越界读取\ntype: pitfall\nstatus: verified\n---\n\n外部正文\n",
    );
    symlinkSync(outside, target);
    try {
      expect(() => readEntries(p, { types: ["pitfall"] })).toThrow(/符号链接/);
    } finally {
      rmSync(target, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
