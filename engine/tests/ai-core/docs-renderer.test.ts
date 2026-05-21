import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDocsBlocks, renderDocsBlocks } from "../../src/ai-core/docs-renderer.ts";

describe("AI Core docs renderer", () => {
  it("renders matching README and README-EN generated block ids", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    const result = await renderDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(true);
    const zh = readFileSync(join(out, "README.md"), "utf8");
    const en = readFileSync(join(out, "README-EN.md"), "utf8");

    expect(blockIds(zh)).toEqual(["command-index", "runtime-support"]);
    expect(blockIds(en)).toEqual(["command-index", "runtime-support"]);
    expect(commandRows(zh)).toHaveLength(10);
    expect(commandRows(en)).toHaveLength(10);
    expect(zh).toContain("`/workspace-manage`");
    expect(en).toContain("Show the feature menu and manage kata project workspaces.");
    const changelog = readFileSync(join(out, "CHANGELOG.md"), "utf8");
    expect(blockIds(changelog)).toEqual(["release-summary"]);
    expect(changelog).toContain("Phase 4 AI Core hardening prepares GA-completion checks");
    expect(changelog).toContain("Phase 5 closed the deterministic baseline failures");
    expect(changelog).toContain("Browser PDF integration is opt-in and environment-dependent");
    expect(changelog).not.toContain("six known baseline areas remain");
    expect(changelog).toContain("does not claim final 4.0.0 GA");
    expect(zh).toContain("/playwright-automation");
    expect(zh).not.toContain("/ui-plan");
    expect(zh).not.toContain("/playwright-gen");
    expect(zh).not.toContain("/run-triage");
    expect((await checkDocsBlocks({ outputRoot: out })).ok).toBe(true);
  });

  it("preserves human content outside managed blocks and replaces stale block content", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    writeFileSync(
      join(out, "README.md"),
      [
        "# Human Title",
        "",
        "before",
        "",
        "<!-- ai-core:start command-index -->",
        "stale generated content",
        "<!-- ai-core:hash bad -->",
        "<!-- ai-core:end command-index -->",
        "",
        "after",
        "",
      ].join("\n"),
    );

    const result = await renderDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(true);
    const rendered = readFileSync(join(out, "README.md"), "utf8");
    expect(rendered).toContain("# Human Title\n\nbefore\n\n");
    expect(rendered).toContain("\n\nafter\n");
    expect(rendered).not.toContain("stale generated content");
    expect(rendered).toContain("`/workspace-manage`");
  });

  it("is deterministic across repeated renders", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const first = snapshotDocs(out);

    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);

    expect(snapshotDocs(out)).toEqual(first);
  });

  it("detects edited generated block bodies", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const readmePath = join(out, "README.md");
    writeFileSync(
      readmePath,
      readFileSync(readmePath, "utf8").replace("`/workspace-manage`", "`/workspace-manage-v2`"),
    );

    const result = await checkDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("docs.generated_block_drift");
  });

  it("fails closed on malformed and unexpected managed markers", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const readmePath = join(out, "README.md");
    const unknownBody = "unknown";
    writeFileSync(
      readmePath,
      [
        readFileSync(readmePath, "utf8"),
        "<!-- ai-core:start mystery -->",
        unknownBody,
        `<!-- ai-core:hash ${createHash("sha256").update(unknownBody).digest("hex")} -->`,
        "<!-- ai-core:end mystery -->",
        "",
      ].join("\n"),
    );

    const unknown = await checkDocsBlocks({ outputRoot: out });
    expect(unknown.ok).toBe(false);
    expect(unknown.issues.map((issue) => issue.code)).toContain("docs.generated_block_unexpected");

    writeFileSync(
      readmePath,
      `${readFileSync(readmePath, "utf8")}\n<!-- ai-core:start command-index -->\n`,
    );
    const malformed = await checkDocsBlocks({ outputRoot: out });
    expect(malformed.ok).toBe(false);
    expect(malformed.issues.map((issue) => issue.code)).toContain("docs.generated_block_malformed");
  });

  it("fails closed on unknown ai-core marker actions", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const readmePath = join(out, "README.md");
    writeFileSync(
      readmePath,
      `${readFileSync(readmePath, "utf8")}\n<!-- ai-core:bogus command-index -->\n`,
    );

    const result = await checkDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "docs.generated_block_unknown_marker",
    );
  });

  it("fails closed on unknown ai-core marker action forms", async () => {
    for (const marker of [
      "<!-- ai-core:bogus_action command-index -->",
      "<!-- ai-core:BOGUS command-index -->",
      "<!-- ai-core:bogus:thing command-index -->",
      "<!-- ai-core:bogus > -->",
    ]) {
      const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
      expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
      const readmePath = join(out, "README.md");
      writeFileSync(readmePath, `${readFileSync(readmePath, "utf8")}\n${marker}\n`);

      const result = await checkDocsBlocks({ outputRoot: out });

      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain(
        "docs.generated_block_unknown_marker",
      );
    }
  });

  it("fails closed on duplicate managed block ids", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const readmePath = join(out, "README.md");
    const text = readFileSync(readmePath, "utf8");
    const duplicate = text.match(
      /<!-- ai-core:start command-index -->[\s\S]*?<!-- ai-core:end command-index -->/,
    )?.[0];
    expect(duplicate).toBeDefined();
    writeFileSync(readmePath, `${text}\n${duplicate}\n`);

    const result = await checkDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("docs.generated_block_duplicate");
  });

  it("fails closed when README block order differs from expected or README-EN", async () => {
    const out = mkdtempSync(join(tmpdir(), "kata-docs-"));
    expect((await renderDocsBlocks({ outputRoot: out })).ok).toBe(true);
    const readmePath = join(out, "README.md");
    const text = readFileSync(readmePath, "utf8");
    const skill = text.match(
      /<!-- ai-core:start command-index -->[\s\S]*?<!-- ai-core:end command-index -->/,
    )?.[0];
    const runtime = text.match(
      /<!-- ai-core:start runtime-support -->[\s\S]*?<!-- ai-core:end runtime-support -->/,
    )?.[0];
    expect(skill).toBeDefined();
    expect(runtime).toBeDefined();
    writeFileSync(readmePath, text.replace(`${skill}\n\n${runtime}`, `${runtime}\n\n${skill}`));

    const result = await checkDocsBlocks({ outputRoot: out });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("docs.generated_block_order");
    expect(result.issues.map((issue) => issue.code)).toContain("docs.readme_block_order_mismatch");
  });
});

function blockIds(text: string): string[] {
  return [...text.matchAll(/<!-- ai-core:start ([^ ]+) -->/g)].map((match) => match[1]);
}

function commandRows(text: string): string[] {
  const block =
    text.match(/<!-- ai-core:start command-index -->\n([\s\S]*?)\n<!-- ai-core:hash /)?.[1] ?? "";
  return block.split("\n").filter((line) => line.startsWith("| `/"));
}

function snapshotDocs(root: string): Record<string, string> {
  return Object.fromEntries(
    ["README.md", "README-EN.md", "CHANGELOG.md"].map((file) => [
      file,
      readFileSync(join(root, file), "utf8"),
    ]),
  );
}
