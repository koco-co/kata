import { describe, expect, it } from "bun:test";
import { parsePluginManifestContract } from "../../src/ai-core/plugin-manifest-contract.ts";

const VALID = `id: fixture-design-source.fetch-design-doc@1
schema_ref: PluginManifest@1
package_root: .ai/core/plugins/fixture-design-source
capability:
  kind: fixture_reader
  network: false
  secrets: false
argv_schema:
  required:
    - fixtureName
output_schema: SourceSnapshot@1
timeout_ms: 1000
artifact_staging:
  enabled: true
  root: .ai/runs/staging
capability_required:
  fs_read:
    - .ai/core/plugins/fixture-design-source/fixtures
  fs_write: []
  net: []
  secret_refs: []
`;

describe("plugin manifest contract parser", () => {
  it("parses nested capability, argv_schema.required, and artifact_staging fields", () => {
    const result = parsePluginManifestContract(
      VALID,
      ".ai/core/plugins/fixture-design-source/plugin.yaml",
    );

    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      id: "fixture-design-source.fetch-design-doc@1",
      schemaRef: "PluginManifest@1",
      packageRoot: ".ai/core/plugins/fixture-design-source",
      capability: {
        kind: "fixture_reader",
        network: "false",
        secrets: "false",
        isolation: undefined,
      },
      argvRequired: ["fixtureName"],
      outputSchema: "SourceSnapshot@1",
      timeoutMs: "1000",
      artifactStaging: {
        enabled: "true",
        root: ".ai/runs/staging",
      },
    });
  });

  it("fails closed when nested required list item is missing", () => {
    const text = VALID.replace("    - fixtureName\n", "");
    const result = parsePluginManifestContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "plugin_manifest.argv_required_missing",
    );
  });

  it("fails closed on duplicate nested scalar fields", () => {
    const text = VALID.replace(
      "  kind: fixture_reader",
      "  kind: fixture_reader\n  kind: fixture_reader",
    );
    const result = parsePluginManifestContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("plugin_manifest.duplicate_key");
  });

  it("fails closed on malformed indentation", () => {
    const text = VALID.replace("  network: false", "   network: false");
    const result = parsePluginManifestContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_indentation");
  });

  it("fails closed on unsupported scalar syntax", () => {
    const comment = parsePluginManifestContract(
      VALID.replace("output_schema: SourceSnapshot@1", "output_schema: SourceSnapshot@1 # bad"),
      "bad.yaml",
    );
    const block = parsePluginManifestContract(
      VALID.replace("output_schema: SourceSnapshot@1", "output_schema: |"),
      "bad.yaml",
    );

    expect(comment.ok).toBe(false);
    expect(comment.issues.map((issue) => issue.code)).toContain("yaml.unsupported_inline_comment");
    expect(block.ok).toBe(false);
    expect(block.issues.map((issue) => issue.code)).toContain("yaml.unsupported_block_scalar");
  });

  it("fails closed on unknown top-level shape", () => {
    const text = VALID.replace("timeout_ms: 1000", "timeout_ms: 1000\nunexpected: true");
    const result = parsePluginManifestContract(text, "bad.yaml");

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("plugin_manifest.missing_field");
  });
});
