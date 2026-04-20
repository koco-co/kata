import { describe, expect, it } from "bun:test";
import { lintArtifactContent } from "../../src/policy/content-lint.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const PRD_SOURCE_REF = `prd.file:demo#sha256:${HASH_A}`;
const COMMAND_SOURCE_REF = `command.output:sample-prd#sha256:${HASH_B}`;

describe("ContentLint P0 slice", () => {
  it("blocks weak Playwright truthy assertions", () => {
    const result = lintArtifactContent("expect(items).toBeTruthy();");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_playwright_assertion");
  });

  it("blocks generated case content without SourceRef", () => {
    const result = lintArtifactContent("Case: user logs in successfully");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("missing_source_ref");
  });

  it("blocks empty SourceRef text markers", () => {
    const result = lintArtifactContent("Case: user logs in successfully\nSourceRef: ");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("missing_source_ref");
  });

  it("blocks empty source_refs arrays", () => {
    const result = lintArtifactContent("source_refs: []\nCase: user logs in successfully");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("missing_source_ref");
  });

  it("allows JSON-ish source_refs arrays with concrete refs", () => {
    const result = lintArtifactContent(
      `source_refs: ["${PRD_SOURCE_REF}"]\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("allows canonical SourceRef text refs", () => {
    const samples = [
      `SourceRef: ${PRD_SOURCE_REF}`,
      `source_refs: ["${PRD_SOURCE_REF}"]`,
      `source_refs: ["${COMMAND_SOURCE_REF}"]`,
      `sourceRefs:\n  - ${PRD_SOURCE_REF}`,
    ];

    for (const sample of samples) {
      const result = lintArtifactContent(
        [sample, "await expect(page.getByText('Welcome')).toBeVisible();"].join("\n"),
      );
      expect(result.ok).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });

  it("rejects arbitrary URL and bare-token source refs", () => {
    const samples = [
      'source_refs: ["http://not-a-source-ref"]',
      'source_refs: ["https://not-a-source-ref"]',
      'source_refs: ["login"]',
      'source_refs: ["source-ref:login"]',
      'source_refs: ["artifact://login"]',
      'source_refs: ["foo#bar"]',
      'source_refs: ["foo@1"]',
      'source_refs: ["prd.file@1"]',
      'source_refs: ["prd.md#login"]',
      'source_refs: ["prd.file:demo#sha256:example"]',
      `source_refs: ["prd.file:demo#sha256:${HASH_A.toUpperCase()}"]`,
    ];

    for (const sample of samples) {
      const result = lintArtifactContent(
        [sample, "await expect(page.getByText('Welcome')).toBeVisible();"].join("\n"),
      );
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain("missing_source_ref");
    }
  });

  it("rejects URL payloads wrapped in accepted SourceRef schemes", () => {
    const samples = [
      'source_refs: ["source-ref:https://not-a-source-ref"]',
      'source_refs: ["artifact://http://not-a-source-ref"]',
    ];

    for (const sample of samples) {
      const result = lintArtifactContent(
        [sample, "await expect(page.getByText('Welcome')).toBeVisible();"].join("\n"),
      );
      expect(result.ok).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain("missing_source_ref");
    }
  });

  it("allows object-ish sourceRefs arrays with concrete refs", () => {
    const result = lintArtifactContent(
      `{"sourceRefs":["${PRD_SOURCE_REF}"]}\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("blocks mixed valid and URL-invalid source_refs", () => {
    const result = lintArtifactContent(
      `source_refs: ["${PRD_SOURCE_REF}", "https://not-a-source-ref"]\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_source_ref");
  });

  it("blocks mixed valid and bare-invalid source_refs", () => {
    const result = lintArtifactContent(
      `source_refs: ["${PRD_SOURCE_REF}", "login"]\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_source_ref");
  });

  it("blocks mixed quoted valid and unquoted invalid source_refs", () => {
    const result = lintArtifactContent(
      `source_refs: ["${PRD_SOURCE_REF}", login]\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_source_ref");
  });

  it("allows multiple valid source_refs", () => {
    const result = lintArtifactContent(
      `source_refs: ["${PRD_SOURCE_REF}", "${COMMAND_SOURCE_REF}"]\nawait expect(page.getByText("Welcome")).toBeVisible();`,
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("blocks filter Boolean weak assertions", () => {
    const result = lintArtifactContent(
      [`SourceRef: ${PRD_SOURCE_REF}`, "const visibleItems = items.filter(Boolean);"].join("\n"),
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_playwright_assertion");
    expect(result.issues.map((issue) => issue.code)).not.toContain("missing_source_ref");
  });

  it("blocks weak assertions with whitespace after the member dot", () => {
    const result = lintArtifactContent(
      [
        `SourceRef: ${PRD_SOURCE_REF}`,
        "expect(items). toBeTruthy();",
        "items. filter(Boolean);",
      ].join("\n"),
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("weak_playwright_assertion");
    expect(result.issues.map((issue) => issue.code)).not.toContain("missing_source_ref");
  });

  it("allows content with concrete assertion and SourceRef", () => {
    const result = lintArtifactContent(
      [
        `SourceRef: ${PRD_SOURCE_REF}`,
        "await expect(page.getByText('Welcome')).toBeVisible();",
      ].join("\n"),
    );

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
