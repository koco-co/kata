import { describe, expect, it } from "bun:test";
import {
  parseYamlContract,
  parseYamlRows,
  readOptionalScalar,
  readOptionalStringList,
  readRequiredScalar,
  readRequiredStringList,
  yamlIssues,
} from "../../src/ai-core/yaml-contract.ts";

describe("yaml contract parser", () => {
  it("parses scalar fields and string lists", () => {
    const parsed = parseYamlContract(
      [
        "id: workspace-manage@1",
        "generated_files:",
        "  - AGENTS.md",
        "  - .agents/skills/workspace-manage/SKILL.md",
        "",
      ].join("\n"),
      "fixture.yaml",
    );

    expect(yamlIssues(parsed)).toEqual([]);
    expect(readRequiredScalar(parsed, "id")).toBe("workspace-manage@1");
    expect(readRequiredStringList(parsed, "generated_files")).toEqual([
      "AGENTS.md",
      ".agents/skills/workspace-manage/SKILL.md",
    ]);
  });

  it("fails closed on block scalars", () => {
    const parsed = parseYamlContract("description: |\n  multiline\n", "bad.yaml");

    expect(yamlIssues(parsed)).toContainEqual({
      code: "yaml.unsupported_block_scalar",
      severity: "error",
      message: "Block scalar is unsupported at line 1.",
      path: "bad.yaml",
    });
  });

  it("fails closed on block scalars with trailing comments", () => {
    const parsed = parseYamlContract("description: | # comment\n  multiline\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_block_scalar",
    );
    expect(() => readOptionalScalar(parsed, "description")).toThrow(
      "yaml.unsupported_block_scalar",
    );
  });

  it("fails closed on inline flow lists", () => {
    const parsed = parseYamlContract("items: [a, b]\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_flow_collection",
    );
    expect(parsed.scalars.has("items")).toBe(false);
  });

  it("fails closed when an inline empty list has block list items", () => {
    const parsed = parseYamlContract("pending_blockers: []\n  - blocker\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.list_without_key");
    expect(() => readOptionalStringList(parsed, "pending_blockers")).toThrow(
      "yaml.list_without_key",
    );
  });

  it("fails closed on inline flow mappings", () => {
    const parsed = parseYamlContract("mapping: {a: b}\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_flow_collection",
    );
    expect(parsed.scalars.has("mapping")).toBe(false);
  });

  it("fails closed on unterminated quoted scalars", () => {
    const parsed = parseYamlContract('reason: "unterminated\n', "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.malformed_quoted_scalar");
    expect(parsed.scalars.has("reason")).toBe(false);
  });

  it("fails closed on mismatched quoted scalars", () => {
    const parsed = parseYamlContract("reason: \"mismatched'\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.malformed_quoted_scalar");
    expect(parsed.scalars.has("reason")).toBe(false);
  });

  it("fails closed on mapping-shaped list items", () => {
    const parsed = parseYamlContract("files:\n  - path: AGENTS.md\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_mapping_list_item",
    );
    expect(() => readRequiredStringList(parsed, "files")).toThrow(
      "yaml.unsupported_mapping_list_item",
    );
  });

  it("preserves quoted colons inside string list values", () => {
    const parsed = parseYamlContract('items:\n  - "a: b"\n', "fixture.yaml");

    expect(yamlIssues(parsed)).toEqual([]);
    expect(readRequiredStringList(parsed, "items")).toEqual(["a: b"]);
  });

  it("fails closed on unquoted inline mapping scalars", () => {
    const parsed = parseYamlContract("reason: privacy policy: https://example.com\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_inline_mapping",
    );
    expect(parsed.scalars.has("reason")).toBe(false);
    expect(() => readRequiredScalar(parsed, "reason")).toThrow("yaml.unsupported_inline_mapping");
  });

  it("fails closed on duplicate keys", () => {
    const parsed = parseYamlContract("id: first\nid: second\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.duplicate_key");
    expect(() => readRequiredScalar(parsed, "id")).toThrow("yaml.duplicate_key");
  });

  it("fails closed on unquoted inline comments", () => {
    const parsed = parseYamlContract("id: ok # comment\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_inline_comment",
    );
    expect(() => readRequiredScalar(parsed, "id")).toThrow("yaml.unsupported_inline_comment");
  });

  it("fails closed on anchors aliases and tags", () => {
    const anchor = parseYamlContract("id: &anchor value\n", "bad.yaml");
    const alias = parseYamlContract("id: *anchor\n", "bad.yaml");
    const tag = parseYamlContract("id: !tag value\n", "bad.yaml");

    expect(yamlIssues(anchor).map((issue) => issue.code)).toContain(
      "yaml.unsupported_node_modifier",
    );
    expect(yamlIssues(alias).map((issue) => issue.code)).toContain(
      "yaml.unsupported_node_modifier",
    );
    expect(yamlIssues(tag).map((issue) => issue.code)).toContain("yaml.unsupported_node_modifier");
  });

  it("does not return list values when later parse issues exist", () => {
    const parsed = parseYamlContract("files:\n  nested: nope\n  - accepted\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_nested_structure",
    );
    expect(() => readOptionalStringList(parsed, "files")).toThrow(
      "yaml.unsupported_nested_structure",
    );
  });

  it("fails closed on malformed indentation", () => {
    const parsed = parseYamlContract("id: ok\n   bad: nope\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("fails closed on tab indentation", () => {
    const parsed = parseYamlContract("id: ok\n\tbad: nope\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("fails closed on nested non-list structures", () => {
    const parsed = parseYamlContract("metadata:\n  owner: qa\n", "bad.yaml");

    expect(yamlIssues(parsed).map((issue) => issue.code)).toContain(
      "yaml.unsupported_nested_structure",
    );
  });

  it("preserves colons inside quoted scalars", () => {
    const parsed = parseYamlContract(
      'reason: "privacy policy: https://example.com"\n',
      "quoted.yaml",
    );

    expect(readRequiredScalar(parsed, "reason")).toBe("privacy policy: https://example.com");
  });

  it("fails closed on duplicate row-list keys", () => {
    const result = parseYamlRows(
      ["files:", "  - path: first", "files:", "  - path: second", ""].join("\n"),
      "bad.yaml",
      "files",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.duplicate_key");
  });

  it("fails closed on duplicate scalar keys around row lists", () => {
    const result = parseYamlRows(
      ["source: first", "files:", "  - path: file", "source: second", ""].join("\n"),
      "bad.yaml",
      "files",
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.duplicate_key");
  });
});
