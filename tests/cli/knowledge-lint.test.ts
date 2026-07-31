import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintKnowledge } from "../../cli/lib/knowledge/lint.ts";

function projectRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-knowledge-lint-"));
  mkdirSync(join(root, "workspace", "demo", "knowledge", "modules"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
}

function write(root: string, path: string, content: string): void {
  const file = join(root, "workspace", "demo", "knowledge", path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

const overview = [
  "---",
  "title: demo 业务概览",
  "type: overview",
  "tags: []",
  "status: verified",
  "source: tests/cli/knowledge-lint.test.ts",
  "updated: 2026-07-31",
  "---",
  "",
  "# demo 业务概览",
  "",
  "## 产品定位",
  "",
  "已记录的测试项目概览。",
  "",
].join("\n");

const moduleEntry = [
  "---",
  "title: 示例模块",
  "type: module",
  "tags: [示例]",
  "status: observed",
  'source: ""',
  "updated: 2026-07-31",
  "---",
  "",
  "# 示例模块",
  "",
  "这是一个有明确状态的观察。",
  "",
].join("\n");

describe("knowledge lint", () => {
  it("accepts canonical entries and an overview", () => {
    const root = projectRoot();
    write(root, "overview.md", overview);
    write(root, "modules/example.md", moduleEntry);

    expect(lintKnowledge("demo", root).violations).toEqual([]);
  });

  it("reports duplicate primary headings, template markers, and unsupported verified claims", () => {
    const root = projectRoot();
    write(
      root,
      "overview.md",
      overview
        .replace("source: tests/cli/knowledge-lint.test.ts", 'source: ""')
        .replace("## 产品定位", "<!-- TODO: 填写产品定位 -->\n\n## 产品定位")
        .concat("# demo 业务概览\n"),
    );

    const rules = lintKnowledge("demo", root).violations.map((item) => item.rule);
    expect(rules).toContain("verified-source");
    expect(rules).toContain("template-marker");
    expect(rules).toContain("primary-heading");
  });

  it("rejects legacy confidence metadata and a directory/type mismatch", () => {
    const root = projectRoot();
    write(root, "overview.md", overview);
    write(
      root,
      "modules/legacy.md",
      moduleEntry
        .replace("type: module", "type: pitfall")
        .replace("status: observed", "confidence: high"),
    );

    const rules = lintKnowledge("demo", root).violations.map((item) => item.rule);
    expect(rules).toContain("legacy-confidence");
    expect(rules).toContain("frontmatter");
  });
});
