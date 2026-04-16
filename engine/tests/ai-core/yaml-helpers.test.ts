import { describe, expect, it } from "bun:test";
import { parseTopLevelYamlFields } from "../../src/ai-core/yaml-helpers.ts";

describe("ai-core yaml helpers", () => {
  it("parses top-level contract fields", () => {
    const fields = parseTopLevelYamlFields(
      [
        "id: workspace-manage@1",
        "schema_ref: WorkflowContract@1",
        "entry_skill: workspace-manage@1",
        "",
      ].join("\n"),
    );

    expect(fields).toEqual({
      id: "workspace-manage@1",
      schema_ref: "WorkflowContract@1",
      entry_skill: "workspace-manage@1",
    });
  });

  it("does not parse indented nested fields as top-level fields", () => {
    const fields = parseTopLevelYamlFields(
      [
        "id: workspace-manage@1",
        "steps:",
        "  - id: inspect_workspace",
        "    entry_skill: nested-value",
        "failure_policy:",
        "  missing_project: ask_one_clarifying_question",
        "",
      ].join("\n"),
    );

    expect(fields).toEqual({
      id: "workspace-manage@1",
      steps: true,
      failure_policy: true,
    });
  });

  it("throws when unsupported yaml syntax is present", () => {
    expect(() => parseTopLevelYamlFields("description: |\n  multiline\n", "bad.yaml")).toThrow(
      "yaml.unsupported_block_scalar",
    );
  });

  it("throws when malformed indentation is present", () => {
    expect(() => parseTopLevelYamlFields("id: ok\n   bad: nope\n", "bad.yaml")).toThrow(
      "yaml.unsupported_indentation",
    );
  });

  it("throws when tab indentation is present", () => {
    expect(() => parseTopLevelYamlFields("id: ok\n\tbad: nope\n", "bad.yaml")).toThrow(
      "yaml.unsupported_indentation",
    );
  });

  it("throws on top-level flow collections", () => {
    expect(() => parseTopLevelYamlFields("items: [a, b]\n", "bad.yaml")).toThrow(
      "yaml.unsupported_flow_collection",
    );
  });

  it("throws on malformed quoted scalars", () => {
    expect(() => parseTopLevelYamlFields('reason: "unterminated\n', "bad.yaml")).toThrow(
      "yaml.malformed_quoted_scalar",
    );
  });

  it("throws on unquoted inline mapping scalars", () => {
    expect(() =>
      parseTopLevelYamlFields("reason: privacy policy: https://example.com\n", "bad.yaml"),
    ).toThrow("yaml.unsupported_inline_mapping");
  });

  it("throws on duplicate top-level keys", () => {
    expect(() => parseTopLevelYamlFields("id: first\nid: second\n", "bad.yaml")).toThrow(
      "yaml.duplicate_key",
    );
  });

  it("throws on unquoted inline comments", () => {
    expect(() => parseTopLevelYamlFields("id: ok # comment\n", "bad.yaml")).toThrow(
      "yaml.unsupported_inline_comment",
    );
  });

  it("throws on anchors aliases and tags", () => {
    expect(() => parseTopLevelYamlFields("id: &anchor value\n", "bad.yaml")).toThrow(
      "yaml.unsupported_node_modifier",
    );
    expect(() => parseTopLevelYamlFields("id: *anchor\n", "bad.yaml")).toThrow(
      "yaml.unsupported_node_modifier",
    );
    expect(() => parseTopLevelYamlFields("id: !tag value\n", "bad.yaml")).toThrow(
      "yaml.unsupported_node_modifier",
    );
  });
});
