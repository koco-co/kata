import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

  it("maps legacy confidence frontmatter to status", () => {
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
    const hits = readEntries(p, { keyword: "旧条目" });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.status).toBe("verified");
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
});
